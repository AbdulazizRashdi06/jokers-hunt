import { action,db,assertDb,json } from '@/lib/server';
export const GET=action(async()=>{
 const {count,error}=await db.from('stages').select('id',{count:'exact',head:true}).eq('enabled',true);
 assertDb(error);
 return json({totalStages:count??0});
});
