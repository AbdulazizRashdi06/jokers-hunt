import { action,db,assertDb,teamAuth,currentStage,json } from '@/lib/server';
export const GET=action(async()=>{
 const team=await teamAuth(),{ss,stage,progress,completed}=await currentStage(team.id);
 const {data:settings,error}=await db.from('game_settings').select('paused,paused_at,paused_total_seconds').eq('id',1).single();
 assertDb(error);
 const curr=stage?progress.find(p=>p.stage_id===stage.id):null;
 return json({
  team:{name:team.name,startedAt:team.started_at,
   startedPauseSeconds:team.started_pause_seconds||0,finishedAt:team.finished_at},
  paused:settings?.paused??false,pausedAt:settings?.paused_at||null,
  pausedTotalSeconds:settings?.paused_total_seconds||0,total:ss.length,
  completed:ss.filter(s=>completed.has(s.id)).map((s,i)=>({
   id:s.id,title:s.title,suit:s.suit,position:ss.findIndex(v=>v.id===s.id)+1
  })),
  notStarted:!team.started_at,
  stage:(team.started_at&&stage)?{
   id:stage.id,position:ss.findIndex(s=>s.id===stage.id)+1,title:stage.title,suit:stage.suit,
   clue:stage.clue,locationLabel:stage.location_label,staffOnly:stage.staff_only,
   checkpointVerified:!!curr?.checkpoint_verified_at,
   hintUsed:!!curr?.hint_used_at,
   question:curr?.checkpoint_verified_at?stage.question:null
  }:null
 });
});
