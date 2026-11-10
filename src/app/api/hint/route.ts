import { NextRequest } from 'next/server';
import { z } from 'zod';
import { action,teamAuth,currentStage,db,assertDb,ApiError,json } from '@/lib/server';
export const POST=action(async(r:NextRequest)=>{
 const team=await teamAuth(),v=z.object({stageId:z.string().uuid()}).parse(await r.json());
 if(!team.started_at) throw new ApiError(409,'Begin the hunt before requesting a hint.');
 const {stage}=await currentStage(team.id);
 if(!stage||stage.id!==v.stageId) throw new ApiError(409,'This hint is locked.');
 const {error}=await db.from('stage_progress').upsert({
  team_id:team.id,stage_id:stage.id,hint_used_at:new Date().toISOString()
 },{onConflict:'team_id,stage_id',ignoreDuplicates:true});
 assertDb(error);
 // Existing progress row may not have a hint timestamp; update it.
 const {error:e}=await db.from('stage_progress').update({hint_used_at:new Date().toISOString()})
 .eq('team_id',team.id).eq('stage_id',stage.id).is('hint_used_at',null);
 assertDb(e);
 return json({hint:stage.hint});
});
