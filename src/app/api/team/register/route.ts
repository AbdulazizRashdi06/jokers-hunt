import { NextRequest } from 'next/server';
import { z } from 'zod';
import { readJson, action,db,assertDb,ApiError,json,normalizeName,newAccess,hashAccess,sha,limit } from '@/lib/server';
import { captainPhoneSchema } from '@/lib/team-input';
import { randomBytes } from 'node:crypto';
const schema=z.object({
 teamName:z.string().trim().min(2).max(45),
 leaderName:z.string().trim().min(2).max(70).transform(s=>s.replace(/\s+/g,' ')),
 captainPhone:captainPhoneSchema,
 size:z.number().int().min(2).max(10)
});
export const POST=action(async(r:NextRequest)=>{
 await limit(r,'team-register',8,3600);
 const v=schema.parse(await readJson(r));
 const access=newAccess(),token=randomBytes(32).toString('base64url');
 const {data:t,error}=await db.from('teams').insert({
  name:v.teamName,name_key:normalizeName(v.teamName),leader_name:v.leaderName,
  captain_phone:v.captainPhone,member_names:[v.leaderName],
  size:v.size,access_hash:hashAccess(access)
 }).select('id').single();
 if(error?.code==='23505') throw new ApiError(409,'That team name is taken. Try a different one.');
 assertDb(error);
 if(!t) throw new ApiError(500,'Team registration did not return a team.');
 const {error:e}=await db.from('team_sessions').insert({
  team_id:t.id,token_hash:sha(token),expires_at:new Date(Date.now()+30*86400000).toISOString()
 });
 assertDb(e);
 const res=json({ok:true,teamName:v.teamName,accessCode:access});
 res.cookies.set('joker_team',token,{httpOnly:true,sameSite:'lax',
  secure:process.env.NODE_ENV==='production',path:'/',maxAge:30*86400});
 return res;
});
