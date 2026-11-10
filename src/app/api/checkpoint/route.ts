import { NextRequest } from 'next/server';
import { z } from 'zod';
import { readJson, action,teamAuth,activeGame,currentStage,db,assertDb,hashCheckpoint,sameHash,ApiError,json,limit } from '@/lib/server';
const schema=z.object({
 stageId:z.string().uuid(),
 value:z.string().trim().min(4).max(300),
 method:z.enum(['qr','backup'])
});
export const POST=action(async(r:NextRequest)=>{
 const team=await teamAuth(); await activeGame();
 if(!team.started_at) throw new ApiError(409,'Start your hunt before attempting a checkpoint.');
 const v=schema.parse(await readJson(r));
 await limit(r,'checkpoint',25,900,team.id);
 const {stage}=await currentStage(team.id);
 if(!stage || stage.id!==v.stageId) throw new ApiError(409,'This is not your current checkpoint.');
 if(stage.staff_only) throw new ApiError(403,'This checkpoint requires a staff member to verify your arrival.');
 let token=v.value;
 if(v.method==='qr') {
  try {
   const u=new URL(token);
   const stageFromQr=u.searchParams.get('stage');
   if(stageFromQr && stageFromQr!==v.stageId) throw new ApiError(409,'That QR belongs to another stage.');
   token=u.searchParams.get('checkpoint')||'';
  } catch(e) { if(e instanceof ApiError) throw e; }
 }
 const expected=v.method==='qr'?stage.qr_hash:stage.backup_hash;
 if(!sameHash(expected,hashCheckpoint(token))) throw new ApiError(400,"Not this checkpoint, trickster. Check the code and try again.");
 const {data,error}=await db.rpc('verify_checkpoint_if_current',{
  p_team:team.id,p_stage:stage.id,p_method:v.method
 });assertDb(error);
 if(!data) throw new ApiError(409,'Checkpoint could not be verified. Refresh and retry.');
 return json({ok:true,message:'Checkpoint found. The Joker has a question for you…'});
});
