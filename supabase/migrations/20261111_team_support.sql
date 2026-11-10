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
