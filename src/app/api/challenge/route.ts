import { NextRequest } from 'next/server';
import { z } from 'zod';
import { action,teamAuth,activeGame,currentStage,db,assertDb,hashAnswer,sameHash,ApiError,json,limit } from '@/lib/server';
const schema=z.object({stageId:z.string().uuid(),answer:z.string().trim().min(1).max(150)});
export const POST=action(async(r:NextRequest)=>{
 const team=await teamAuth();await activeGame();
 if(!team.started_at) throw new ApiError(409,'Start your hunt first.');
 const v=schema.parse(await r.json());await limit(r,'answer',35,900,team.id);
 const {stage,progress}=await currentStage(team.id);
 if(!stage||stage.id!==v.stageId) throw new ApiError(409,'That card is locked. Solve your current stage.');
 if(!progress.some(p=>p.stage_id===stage.id&&p.checkpoint_verified_at)) throw new ApiError(403,'Verify the physical checkpoint first.');
 if(!sameHash(stage.answer_hash,hashAnswer(v.answer))) throw new ApiError(400,'A clever guess, but the Joker is not impressed. Try again!');
 const {data,error}=await db.rpc('complete_stage_if_current',{p_team:team.id,p_stage:stage.id});
 assertDb(error); if(!data) throw new ApiError(409,'Could not complete this stage. Refresh and retry.');
 return json({ok:true,message:'Another card collected. But can you outsmart the next one?'});
});
