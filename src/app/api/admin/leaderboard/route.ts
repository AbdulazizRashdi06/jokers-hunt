import { action,adminAuth,db,assertDb,json } from '@/lib/server';
import { getLeaderboard } from '@/lib/leaderboard';
export const GET=action(async()=>{
 await adminAuth();
 const [rows,{data,error}]=await Promise.all([getLeaderboard(),db.from('game_settings').select('paused').eq('id',1).single()]);
 assertDb(error);return json({rows,paused:!!data?.paused});
});
