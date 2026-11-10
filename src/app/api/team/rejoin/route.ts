import { NextRequest } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { readJson, action,db,assertDb,ApiError,json,normalizeName,hashAccess,sameHash,sha,limit } from '@/lib/server';
const schema=z.object({teamName:z.string().trim().min(2).max(45),accessCode:z.string().trim().min(8).max(32),memberName:z.string().trim().min(2).max(70)});
export const POST=action(async(r:NextRequest)=>{
 const v=schema.parse(await readJson(r));
 await limit(r,'team-rejoin-total',20,900);
 await limit(r,'team-rejoin',8,900,normalizeName(v.teamName));
 const {data:t,error}=await db.from('teams').select('id,name,access_hash')
 .eq('name_key',normalizeName(v.teamName)).maybeSingle();
 assertDb(error);
 if(!t || !sameHash(t.access_hash,hashAccess(v.accessCode))) throw new ApiError(401,'Team name or access code is incorrect.');
 const {data:joined,error:joinError}=await db.rpc('join_team_member',{p_team:t.id,p_access_hash:hashAccess(v.accessCode),p_name:v.memberName});
 assertDb(joinError);
 if(joined==='full') throw new ApiError(409,'This team is full. If you already joined, use the same name or username.');
 if(joined!=='ok') throw new ApiError(401,'Team name or access code is incorrect.');
 const token=randomBytes(32).toString('base64url');
 const {error:e}=await db.from('team_sessions').insert({
  team_id:t.id,token_hash:sha(token),expires_at:new Date(Date.now()+30*86400000).toISOString()
 }); assertDb(e);
 const res=json({ok:true,teamName:t.name});
 res.cookies.set('joker_team',token,{httpOnly:true,sameSite:'lax',
  secure:process.env.NODE_ENV==='production',path:'/',maxAge:30*86400});
 return res;
});
