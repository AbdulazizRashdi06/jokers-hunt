import { action,teamAuth,activeGame,db,assertDb,json } from '@/lib/server';
export const POST=action(async()=>{
 const team=await teamAuth();await activeGame();
 const {data:settings,error:se}=await db.from('game_settings').select('paused_total_seconds').eq('id',1).single();
 assertDb(se);
 const {error}=await db.from('teams').update({
  started_at:new Date().toISOString(),started_pause_seconds:settings?.paused_total_seconds||0
 })
 .eq('id',team.id).is('started_at',null);
 assertDb(error);
 return json({ok:true});
});
