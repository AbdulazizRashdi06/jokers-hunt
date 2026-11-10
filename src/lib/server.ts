import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createHash, createHmac, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

function env(name:string) {
 const v=process.env[name];
 if(!v) throw new Error(`Missing server environment variable: ${name}`);
 return v;
}
export const db = createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{
 auth:{persistSession:false,autoRefreshToken:false}
});
export const anon = () => createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{
 auth:{persistSession:false,autoRefreshToken:false}
});
export class ApiError extends Error { constructor(public status:number, message:string){ super(message); } }
export function assertDb(error: {message:string}|null) {
 if(error) { console.error('Database:',error.message); throw new ApiError(500,'Database error. Please try again.'); }
}
export function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function action(handler:(r:NextRequest)=>Promise<NextResponse>) {
 return async (r:NextRequest):Promise<NextResponse> => {
  try {
   if(!['GET','HEAD'].includes(r.method)) {
    const origin=r.headers.get('origin');
    // The configured public origin can differ from the URL behind a reverse proxy.
    if(origin && origin!==new URL(r.url).origin && origin!==new URL(siteUrl(r)).origin) {
     throw new ApiError(403,'Invalid request origin.');
    }
   }
   return await handler(r);
  } catch(err) {
   if(err instanceof ApiError) return json({error:err.message},err.status);
   if(err && typeof err==='object' && 'issues' in err) return json({error:'Please check the fields and try again.'},400);
   console.error('API error:',err);
   return json({error:'Something went wrong. Please try again.'},500);
  }
 };
}
export const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export const keyed=(s:string)=>createHmac('sha256',env('GAME_SECRET')).update(s).digest('hex');
export const normalizeAnswer=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleUpperCase('en-US');
export const normalizeName=(s:string)=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
export const hashAnswer=(s:string)=>keyed('answer:'+normalizeAnswer(s));
export const hashCheckpoint=(s:string)=>keyed('checkpoint:'+s.trim().toUpperCase());
export const hashAccess=(s:string)=>keyed('teamaccess:'+s.toUpperCase().replace(/[^A-Z0-9]/g,''));
export function sameHash(a:string,b:string) {
 const aa=Buffer.from(a,'hex'),bb=Buffer.from(b,'hex');
 return aa.length===bb.length && timingSafeEqual(aa,bb);
}
export function seal(s:string){
 const key=Buffer.from(env('GAME_ENCRYPTION_KEY'),'hex');
 if(key.length!==32) throw new Error('GAME_ENCRYPTION_KEY must be 64 hex characters.');
 const iv=randomBytes(12), c=createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([c.update(s,'utf8'),c.final()]);
 return Buffer.concat([iv,c.getAuthTag(),ciphertext]).toString('base64');
}
export function unseal(s:string){
 const b=Buffer.from(s,'base64'),key=Buffer.from(env('GAME_ENCRYPTION_KEY'),'hex');
 const decipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));
 decipher.setAuthTag(b.subarray(12,28));
 return Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8');
}
const alpha='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function code(length:number) {
 const bytes=randomBytes(length); return [...bytes].map(n=>alpha[n%alpha.length]).join('');
}
export function newAccess(){const s=code(12);return `JH-${s.slice(0,4)}-${s.slice(4,8)}-${s.slice(8)}`;}
export function newCheckpoint(){return randomBytes(24).toString('base64url');}
export const makeCookie=(name:string,value:string,days=30)=>{
 const res=NextResponse.json({ok:true}); res.cookies.set(name,value,{
  httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',
  path:'/',maxAge:days*86400
 }); return res;
};
export async function teamAuth() {
 const token=(await cookies()).get('joker_team')?.value;
 if(!token) throw new ApiError(401,'Please register or rejoin your team.');
 const {data:s,error}=await db.from('team_sessions').select('team_id').eq('token_hash',sha(token))
 .gt('expires_at',new Date().toISOString()).maybeSingle();
 assertDb(error);
 if(!s) throw new ApiError(401,'Your team session expired. Rejoin with your access code.');
 const {data:t,error:e}=await db.from('teams').select('id,name,started_at,started_pause_seconds,finished_at').eq('id',s.team_id).single();
 assertDb(e);
 if(!t) throw new ApiError(401,'Team not found.');
 return t as {id:string;name:string;started_at:string|null;started_pause_seconds:number|null;finished_at:string|null};
}
export async function adminAuth() {
 const token=(await cookies()).get('joker_admin')?.value;
 if(!token) throw new ApiError(401,'Organizer login required.');
 const {data:s,error}=await db.from('admin_sessions').select('user_id')
 .eq('token_hash',sha(token)).gt('expires_at',new Date().toISOString()).maybeSingle();
 assertDb(error);
 if(!s) throw new ApiError(401,'Organizer session expired. Please log in.');
 return s.user_id as string;
}
export async function activeGame() {
 const {data,error}=await db.from('game_settings').select('paused').eq('id',1).single();
 assertDb(error); if(data?.paused) throw new ApiError(423,'The Joker has paused the hunt. Check back shortly.');
}
export async function stages() {
 const {data,error}=await db.from('stages').select('*').eq('enabled',true).order('position').order('id');
 assertDb(error); return data||[];
}
export async function currentStage(teamId:string) {
 const ss=await stages();
 const {data:p,error}=await db.from('stage_progress').select('stage_id,checkpoint_verified_at,completed_at,hint_used_at')
 .eq('team_id',teamId);
 assertDb(error);
 const completed=new Set((p||[]).filter(x=>x.completed_at).map(x=>x.stage_id));
 return {ss,progress:p||[],completed,stage:ss.find(s=>!completed.has(s.id))||null};
}
export async function limit(r:NextRequest,prefix:string,max:number,windowSeconds=600,extra='') {
 const ip=r.headers.get('x-real-ip')||r.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
 const key=sha(prefix+':'+ip+':'+extra);
 const {data,error}=await db.rpc('consume_rate_limit',{p_key:key,p_limit:max,p_window_seconds:windowSeconds});
 assertDb(error);
 if(!data) throw new ApiError(429,'Too many attempts. Try again a little later.');
}
export async function audit(admin:string,actionName:string,opts:{team_id?:string;stage_id?:string;reason?:string}={}) {
 const {error}=await db.from('audit_log').insert({admin_id:admin,action:actionName,...opts});
 assertDb(error);
}
export function siteUrl(r:NextRequest){
 return (process.env.NEXT_PUBLIC_SITE_URL||new URL(r.url).origin).replace(/\/$/,'');
}
