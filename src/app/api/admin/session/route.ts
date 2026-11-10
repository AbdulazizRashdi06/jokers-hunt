import { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { readJson, action,adminAuth,anon,db,assertDb,ApiError,json,sha,limit } from '@/lib/server';
import { cookies } from 'next/headers';
export const GET=action(async()=>{
 await adminAuth();return json({ok:true});
});
export const POST=action(async(r:NextRequest)=>{
 await limit(r,'admin-login',7,900);
 const {email,password}=z.object({email:z.string().trim().email().max(254),password:z.string().min(1).max(1024)}).parse(await readJson(r));
 const {data,error}=await anon().auth.signInWithPassword({email,password});
 if(error||!data.user) throw new ApiError(401,'Invalid organizer credentials.');
 const {data:allow,error:e}=await db.from('admin_users').select('id').eq('id',data.user.id).maybeSingle();
 assertDb(e);
 if(!allow) throw new ApiError(401,'Invalid organizer credentials.');
 const token=randomBytes(32).toString('base64url');
 const {error:s}=await db.from('admin_sessions').insert({
  token_hash:sha(token),user_id:data.user.id,
  expires_at:new Date(Date.now()+8*3600000).toISOString()
 }); assertDb(s);
 const res=json({ok:true});res.cookies.set('joker_admin',token,{httpOnly:true,
  sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*3600});
 return res;
});
export const DELETE=action(async()=>{
 const token=(await cookies()).get('joker_admin')?.value;
 if(token) await db.from('admin_sessions').delete().eq('token_hash',sha(token));
 const res=json({ok:true});res.cookies.delete('joker_admin');return res;
});
