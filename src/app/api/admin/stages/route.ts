import { NextRequest } from 'next/server';
import { z } from 'zod';
import { readJson,action,db,assertDb,adminAuth,audit,unseal,seal,hashAnswer,
 hashCheckpoint,newCheckpoint,code,ApiError,json } from '@/lib/server';

const base=z.object({
 title:z.string().trim().min(2).max(65),
 suit:z.enum(['♠','♥','♦','♣','★']),
 locationLabel:z.string().trim().min(2).max(110),
 clue:z.string().trim().min(5).max(1200),
 hint:z.string().trim().min(3).max(600),
 question:z.string().trim().min(5).max(1200),
 answer:z.string().trim().max(150).optional(),
 staffOnly:z.boolean(),enabled:z.boolean(),
 position:z.number().int().min(1).max(500)
});
async function list(){
 const {data,error}=await db.from('stages').select('*').order('position').order('id');
 assertDb(error);
 return (data||[]).map(s=>({
  id:s.id,title:s.title,suit:s.suit,locationLabel:s.location_label,
  clue:s.clue,hint:s.hint,question:s.question,answer:unseal(s.answer_ciphertext),
  qrToken:unseal(s.qr_ciphertext),backupCode:unseal(s.backup_ciphertext),
  staffOnly:s.staff_only,enabled:s.enabled,position:s.position
 }));
}
export const GET=action(async()=>{
 await adminAuth();return json({stages:await list()});
});
export const POST=action(async(r:NextRequest)=>{
 const admin=await adminAuth();
 const body=z.object({action:z.unknown(),ids:z.unknown().optional(),stage:z.unknown().optional(),id:z.unknown().optional()}).parse(await readJson(r));
 const verb=z.enum(['create','update','delete','rotateQr','rotateBackup','reorder']).parse(body.action);
 if(verb==='reorder'){
  const ids=z.array(z.string().uuid()).min(1).max(100).parse(body.ids);
  if(new Set(ids).size!==ids.length) throw new ApiError(400,'Duplicate stages.');
  const before=await list();
  if(before.length!==ids.length||before.some(x=>!ids.includes(x.id)))
   throw new ApiError(400,'The order must include every stage.');
  for(let i=0;i<ids.length;i++){
   const {error}=await db.from('stages').update({position:i+1}).eq('id',ids[i]);
   assertDb(error);
  }
  await audit(admin,'reorder_stages');
 } else if(verb==='create'){
  const v=base.extend({answer:z.string().trim().min(1).max(150)}).parse(body.stage);
  const qr=newCheckpoint(),backup=code(8);
  const {error}=await db.from('stages').insert({
   position:v.position,title:v.title,suit:v.suit,location_label:v.locationLabel,
   clue:v.clue,hint:v.hint,question:v.question,
   answer_hash:hashAnswer(v.answer),answer_ciphertext:seal(v.answer),
   qr_hash:hashCheckpoint(qr),qr_ciphertext:seal(qr),
   backup_hash:hashCheckpoint(backup),backup_ciphertext:seal(backup),
   staff_only:v.staffOnly,enabled:v.enabled
  });
  assertDb(error);await audit(admin,'create_stage');
 } else {
  const id=z.string().uuid().parse(body.id);
  const {data:old,error:e}=await db.from('stages').select('id').eq('id',id).maybeSingle();
  assertDb(e);if(!old) throw new ApiError(404,'Stage not found.');
  if(verb==='update'){
   const v=base.parse(body.stage);
   const fields:Record<string,unknown>={
    title:v.title,suit:v.suit,location_label:v.locationLabel,clue:v.clue,
    hint:v.hint,question:v.question,staff_only:v.staffOnly,
    enabled:v.enabled,position:v.position
   };
   if(v.answer){fields.answer_hash=hashAnswer(v.answer);fields.answer_ciphertext=seal(v.answer);}
   const {error}=await db.from('stages').update(fields).eq('id',id);
   assertDb(error);await audit(admin,'update_stage',{stage_id:id});
  }
  if(verb==='rotateQr'||verb==='rotateBackup'){
   const qr=verb==='rotateQr',value=qr?newCheckpoint():code(8);
   const {error}=await db.from('stages').update(qr?
    {qr_hash:hashCheckpoint(value),qr_ciphertext:seal(value)}:
    {backup_hash:hashCheckpoint(value),backup_ciphertext:seal(value)}
   ).eq('id',id);
   assertDb(error);await audit(admin,verb==='rotateQr'?'rotate_qr':'rotate_backup',{stage_id:id});
  }
  if(verb==='delete'){
   const {data:used,error:u}=await db.from('stage_progress').select('team_id').eq('stage_id',id).limit(1);
   assertDb(u);
   if(used?.length) throw new ApiError(409,'Teams have progress here. Disable the stage instead of deleting it.');
   const {error}=await db.from('stages').delete().eq('id',id);
   assertDb(error);await audit(admin,'delete_stage',{stage_id:id});
  }
 }
 return json({ok:true,stages:await list()});
});
