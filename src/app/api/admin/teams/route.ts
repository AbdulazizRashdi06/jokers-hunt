import { NextRequest } from 'next/server';
import { z } from 'zod';
import { action,db,assertDb,adminAuth,audit,ApiError,json,currentStage } from '@/lib/server';
export const GET=action(async()=>{
 await adminAuth();
 const {data:teams,error}=await db.from('teams').select('id,name,leader_name,size,registered_at,started_at,finished_at').order('registered_at');
 assertDb(error);
 const {data:progress,error:e}=await db.from('stage_progress').select('team_id,stage_id,checkpoint_verified_at,completed_at');
 assertDb(e);
 const {data:setting,error:se}=await db.from('game_settings').select('paused').eq('id',1).single();
 assertDb(se);
 return json({paused:!!setting?.paused,teams:(teams||[]).map(t=>({
  id:t.id,name:t.name,leaderName:t.leader_name,size:t.size,
  startedAt:t.started_at,finishedAt:t.finished_at,
  completed:(progress||[]).filter(p=>p.team_id===t.id&&p.completed_at).length,
  checkpointVerified:(progress||[]).filter(p=>p.team_id===t.id&&p.checkpoint_verified_at&&!p.completed_at).map(p=>p.stage_id)
 }))});
});
export const POST=action(async(r:NextRequest)=>{
 const admin=await adminAuth(),v=z.object({
  action:z.enum(['staffVerify','unblock','pause','resume']),
  teamId:z.string().uuid().optional(),stageId:z.string().uuid().optional(),
  reason:z.string().trim().max(400).optional()
 }).parse(await r.json());
 if(v.action==='pause'||v.action==='resume'){
  const {error}=await db.rpc('set_game_pause',{p_pause:v.action==='pause'});assertDb(error);
  await audit(admin,v.action);return json({ok:true});
 }
 if(!v.teamId||!v.stageId||(v.reason||'').length<8)
  throw new ApiError(400,'Choose a team, current stage, and a reason of at least 8 characters.');
 const {stage,ss}=await currentStage(v.teamId);
 if(!stage||stage.id!==v.stageId) throw new ApiError(409,'That is not the current stage for this team.');
 const {data:settings,error:se}=await db.from('game_settings').select('paused,paused_total_seconds').eq('id',1).single();
 assertDb(se);
 if(settings?.paused&&v.action==='unblock') throw new ApiError(423,'Resume the game before manually completing a stage.');
 const {data:target,error:te}=await db.from('teams').select('started_at').eq('id',v.teamId).maybeSingle();
 assertDb(te);
 if(!target?.started_at) throw new ApiError(409,'This team has not started its hunt yet.');
 const now=new Date().toISOString();
 const {error:e}=await db.from('stage_progress').upsert({
  team_id:v.teamId,stage_id:v.stageId,checkpoint_verified_at:now,verification_method:'staff'
 },{onConflict:'team_id,stage_id',ignoreDuplicates:true});assertDb(e);
 const {error:ee}=await db.from('stage_progress').update({
  checkpoint_verified_at:now,verification_method:'staff'
 }).eq('team_id',v.teamId).eq('stage_id',v.stageId).is('checkpoint_verified_at',null);
 assertDb(ee);
 if(v.action==='unblock'){
  const {error:done}=await db.from('stage_progress').update({completed_at:now})
  .eq('team_id',v.teamId).eq('stage_id',v.stageId);
  assertDb(done);
  if(ss.filter(s=>s.enabled).length===1 ||
     (await currentStage(v.teamId)).stage===null){
   const {error:fin}=await db.from('teams').update({finished_at:now,finished_pause_seconds:settings?.paused_total_seconds||0}).eq('id',v.teamId);
   assertDb(fin);
  }
 }
 await audit(admin,v.action,{team_id:v.teamId,stage_id:v.stageId,reason:v.reason});
 return json({ok:true});
});
