import { action,db,assertDb,json } from '@/lib/server';
export const GET=action(async()=>{
 const {count,error}=await db.from('stages').select('id',{count:'exact',head:true}).eq('enabled',true);
 assertDb(error);
 const {data:settings,error:se}=await db.from('game_settings').select('help_phone').eq('id',1).single();
 assertDb(se);
 return json({totalStages:count??0,helpPhone:settings?.help_phone||''});
});
