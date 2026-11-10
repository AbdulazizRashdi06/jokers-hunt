import { NextRequest } from 'next/server';
import { z } from 'zod';
import { readJson, action,adminAuth,db,assertDb,json,audit } from '@/lib/server';
export const POST=action(async(r:NextRequest)=>{
 const admin=await adminAuth();
 const {helpPhone}=z.object({helpPhone:z.string().trim().max(30).refine(v=>!v||(/^\+?[0-9 ()-]{6,30}$/.test(v)&&v.replace(/\D/g,'').length>=6&&v.replace(/\D/g,'').length<=15),'Enter a phone number.')}).parse(await readJson(r));
 const {error}=await db.from('game_settings').update({help_phone:helpPhone,updated_at:new Date().toISOString()}).eq('id',1);
 assertDb(error);await audit(admin,'updateHelpPhone');return json({ok:true});
});
