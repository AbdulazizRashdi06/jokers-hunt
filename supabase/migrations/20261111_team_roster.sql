-- Captain contact is only read by organizer routes; never by the leaderboard.
alter table public.teams add column if not exists captain_phone text;
alter table public.teams add column if not exists member_names text[] not null default '{}';
update public.teams set member_names=array[leader_name] where cardinality(member_names)=0;

-- Lock the roster so two simultaneous joins cannot overfill a team.
create or replace function public.join_team_member(p_team uuid,p_access_hash text,p_name text)
returns text language plpgsql security definer set search_path=public as $$
declare v_team public.teams%rowtype; v_name text;
begin
 v_name=regexp_replace(trim(p_name),'\s+',' ','g');
 if v_name is null or length(v_name)<2 or length(v_name)>70 then return 'invalid'; end if;
 select * into v_team from public.teams where id=p_team for update;
 if not found or v_team.access_hash is distinct from p_access_hash then return 'invalid'; end if;
 if exists(select 1 from unnest(v_team.member_names) n where lower(n)=lower(v_name)) then return 'ok'; end if;
 if cardinality(v_team.member_names)>=v_team.size then return 'full'; end if;
 update public.teams set member_names=array_append(member_names,v_name) where id=p_team;
 return 'ok';
end; $$;
revoke all on function public.join_team_member(uuid,text,text) from public,anon,authenticated;
grant execute on function public.join_team_member(uuid,text,text) to service_role;
