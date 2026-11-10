-- THE JOKER'S HUNT: paste this entire file in Supabase > SQL Editor > Run.
create extension if not exists pgcrypto;

create table if not exists public.game_settings (
 id integer primary key default 1 check (id=1),
 paused boolean not null default false,
 paused_at timestamptz,
 paused_total_seconds bigint not null default 0,
 updated_at timestamptz not null default now()
);
insert into public.game_settings(id) values(1) on conflict do nothing;

create table if not exists public.teams (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 name_key text not null unique,
 leader_name text not null,
 size integer not null check(size between 2 and 10),
 access_hash text not null unique,
 registered_at timestamptz not null default now(),
 started_at timestamptz,
 started_pause_seconds bigint,
 finished_at timestamptz,
 finished_pause_seconds bigint
);

create table if not exists public.stages (
 id uuid primary key default gen_random_uuid(),
 position integer not null check(position > 0),
 title text not null,
 suit text not null check (suit in ('♠','♥','♦','♣','★')),
 location_label text not null,
 clue text not null,
 hint text not null,
 question text not null,
 answer_hash text not null,
 answer_ciphertext text not null,
 qr_hash text not null,
 qr_ciphertext text not null,
 backup_hash text not null,
 backup_ciphertext text not null,
 staff_only boolean not null default false,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create index if not exists stages_position_idx on public.stages(position,id);

create table if not exists public.stage_progress (
 team_id uuid not null references public.teams(id) on delete cascade,
 stage_id uuid not null references public.stages(id) on delete cascade,
 checkpoint_verified_at timestamptz,
 verification_method text,
 hint_used_at timestamptz,
 completed_at timestamptz,
 primary key(team_id,stage_id)
);
create index if not exists progress_completed_idx on public.stage_progress(stage_id,completed_at);

create table if not exists public.team_sessions (
 token_hash text primary key,
 team_id uuid not null references public.teams(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index if not exists team_sessions_expires_idx on public.team_sessions(expires_at);

create table if not exists public.admin_users (
 id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.admin_sessions (
 token_hash text primary key,
 user_id uuid not null references public.admin_users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
 id bigint generated always as identity primary key,
 admin_id uuid not null references public.admin_users(id),
 action text not null,
 team_id uuid,
 stage_id uuid,
 reason text,
 created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
 key text primary key,
 window_start timestamptz not null default now(),
 attempts integer not null default 0
);

-- No direct browser/anonymous read or write access. Only server-side service role.
alter table public.game_settings enable row level security;
alter table public.teams enable row level security;
alter table public.stages enable row level security;
alter table public.stage_progress enable row level security;
alter table public.team_sessions enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

-- Keep cumulative pause duration so rankings do not count organizer downtime.
create or replace function public.set_game_pause(p_pause boolean)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_paused boolean; v_at timestamptz;
begin
 select paused,paused_at into v_paused,v_at from public.game_settings where id=1 for update;
 if p_pause and not v_paused then
  update public.game_settings set paused=true,paused_at=now(),updated_at=now() where id=1;
 elsif not p_pause and v_paused then
  update public.game_settings set paused=false,paused_at=null,
   paused_total_seconds=paused_total_seconds+greatest(0,extract(epoch from now()-v_at)::bigint),
   updated_at=now() where id=1;
 end if;
 return true;
end; $$;

-- Atomic rate limiter used for login, rejoin and answer guesses.
create or replace function public.consume_rate_limit(
 p_key text, p_limit integer, p_window_seconds integer
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_attempts integer;
begin
 insert into public.rate_limits(key,window_start,attempts)
 values(p_key,now(),1)
 on conflict(key) do update
 set attempts = case when public.rate_limits.window_start <
   now() - make_interval(secs => p_window_seconds)
   then 1 else public.rate_limits.attempts+1 end,
 window_start = case when public.rate_limits.window_start <
   now() - make_interval(secs => p_window_seconds)
   then now() else public.rate_limits.window_start end
 returning attempts into v_attempts;
 return v_attempts <= p_limit;
end; $$;

-- Atomic checkpoint verification: never verifies another stage or a paused game.
create or replace function public.verify_checkpoint_if_current(
 p_team uuid, p_stage uuid, p_method text
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_current uuid; v_staff boolean;
begin
 perform 1 from public.teams where id=p_team for update;
 if not found or (select paused from public.game_settings where id=1)
 or (select started_at is null from public.teams where id=p_team) then return false; end if;
 select s.id,s.staff_only into v_current,v_staff from public.stages s
 where s.enabled and not exists(
  select 1 from public.stage_progress p
  where p.team_id=p_team and p.stage_id=s.id and p.completed_at is not null
 ) order by s.position,s.id limit 1;
 if v_current is distinct from p_stage then return false; end if;
 if v_staff and p_method <> 'staff' then return false; end if;
 insert into public.stage_progress(team_id,stage_id,checkpoint_verified_at,verification_method)
 values(p_team,p_stage,now(),p_method)
 on conflict(team_id,stage_id) do update
 set checkpoint_verified_at=coalesce(public.stage_progress.checkpoint_verified_at,now()),
 verification_method=coalesce(public.stage_progress.verification_method,excluded.verification_method);
 return true;
end; $$;

-- Atomic stage completion, requires a verified checkpoint and correct stage order.
-- Correct answer is validated with a server-only keyed hash BEFORE this RPC is called.
create or replace function public.complete_stage_if_current(
 p_team uuid, p_stage uuid
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_current uuid;
begin
 perform 1 from public.teams where id=p_team for update;
 if not found or (select paused from public.game_settings where id=1)
 or (select started_at is null from public.teams where id=p_team) then return false; end if;
 select s.id into v_current from public.stages s where s.enabled and not exists(
  select 1 from public.stage_progress p
  where p.team_id=p_team and p.stage_id=s.id and p.completed_at is not null
 ) order by s.position,s.id limit 1;
 if v_current is distinct from p_stage then return false; end if;
 update public.stage_progress set completed_at=coalesce(completed_at,now())
 where team_id=p_team and stage_id=p_stage and checkpoint_verified_at is not null;
 if not found then return false; end if;
 if not exists(select 1 from public.stages s where s.enabled and not exists(
  select 1 from public.stage_progress p
  where p.team_id=p_team and p.stage_id=s.id and p.completed_at is not null
 )) then
  update public.teams set finished_at=now(),
   finished_pause_seconds=(select paused_total_seconds from public.game_settings where id=1)
   where id=p_team;
 end if;
 return true;
end; $$;

-- Only the server's service role may invoke privileged RPC functions.
revoke all on function public.set_game_pause(boolean) from public,anon,authenticated;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.verify_checkpoint_if_current(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.complete_stage_if_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_game_pause(boolean) to service_role;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant execute on function public.verify_checkpoint_if_current(uuid,uuid,text) to service_role;
grant execute on function public.complete_stage_if_current(uuid,uuid) to service_role;
-- Run once in the Supabase SQL editor before deploying this update.
alter table public.game_settings add column if not exists help_phone text not null default '';

-- Keep recovery/deletion and their audit records in a single transaction.
create or replace function public.organizer_team_action(
 p_admin uuid, p_team uuid, p_action text, p_reason text, p_access_hash text default null,
 p_confirm_name text default null
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_team public.teams%rowtype;
begin
 if not exists(select 1 from public.admin_users where id=p_admin) then
  raise exception 'Organizer required';
 end if;
 select * into v_team from public.teams where id=p_team for update;
 if not found then return false; end if;
 if length(trim(p_reason))<8 then raise exception 'Reason required'; end if;
 if p_action='deleteTeam' then
  if p_confirm_name is distinct from v_team.name then raise exception 'Confirmation does not match'; end if;
  insert into public.audit_log(admin_id,action,team_id,reason)
   values(p_admin,p_action,p_team,p_reason || ' [Team: ' || v_team.name || ']');
  delete from public.teams where id=p_team;
 elsif p_action='resetAccess' then
  if p_access_hash is null then raise exception 'Access hash required'; end if;
  update public.teams set access_hash=p_access_hash where id=p_team;
  delete from public.team_sessions where team_id=p_team;
  insert into public.audit_log(admin_id,action,team_id,reason) values(p_admin,p_action,p_team,p_reason);
 else raise exception 'Unknown action';
 end if;
 return true;
end; $$;
revoke all on function public.organizer_team_action(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.organizer_team_action(uuid,uuid,text,text,text,text) to service_role;
