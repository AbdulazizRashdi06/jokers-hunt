import 'server-only';
import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import { randomUUID,randomBytes,createHash,timingSafeEqual } from 'node:crypto';
import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import path from 'node:path';
import { captainPhoneSchema } from './team-input';

type Stage={id:string;position:number;title:string;suit:string;locationLabel:string;clue:string;hint:string;question:string;answer:string;qrToken:string;backupCode:string;staffOnly:boolean;enabled:boolean};
type Progress={stageId:string;verified:boolean;done:boolean;hint:boolean};
type Team={id:string;name:string;leaderName:string;size:number;accessHash:string;captainPhone?:string;memberNames?:string[];startedAt:string|null;finishedAt:string|null;progress:Progress[];startedPauseSeconds:number;finishedPauseSeconds:number};
type Store={stages:Stage[];teams:Team[];sessions:Record<string,{teamId?:string;admin?:boolean;expires:number}>;paused:boolean;pausedAt:string|null;pausedTotalSeconds:number;helpPhone:string;audit:{action:string;teamId?:string;reason?:string;at:string}[]};
const directory=path.join(process.cwd(),'.local-data'),file=path.join(directory,'preview.json');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const accessHash=(s:string)=>hash(s.toUpperCase().replace(/[^A-Z0-9]/g,''));
const access=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',c=[...randomBytes(8)].map(b=>a[b%32]).join('');return c.slice(0,4)+'-'+c.slice(4);};
const now=()=>new Date().toISOString();
const fail=(status:number,message:string):never=>{throw Object.assign(new Error(message),{status});};
const equal=(a:string,b:string)=>timingSafeEqual(Buffer.from(hash(a),'hex'),Buffer.from(hash(b),'hex'));
function initial():Store{
 const samples=[
  ['The Whispering Card','♠','Library','Where stories sleep, your first card waits.','Listen for something that repeats.','What speaks without a mouth and hears without ears?','ECHO'],
  ['Three Is a Crowd','♥','Courtyard','Meet where the paths cross.','Count each pair once.','Three people shake hands with each other once. How many handshakes?','3'],
  ['The Secret Alphabet','♦','Student lounge','A secret is hiding where students unwind.','Move each letter back three places.','Decode MRNHU with a Caesar shift of three letters backwards.','JOKER'],
  ['A Matter of Suits','♣','Main hall','Find your next card at the heart of campus.','It is one of the two red suits.','Which red playing-card suit has a point at both top and bottom?','DIAMONDS'],
  ['The Final Key','★','Club room','The Joker awaits where your crew belongs.','You use it to type.','What has keys but no locks, space but no rooms, and Enter but no doorway?','KEYBOARD']
 ];
 const stages=samples.map(([title,suit,locationLabel,clue,hint,question,answer],i)=>({id:randomUUID(),position:i+1,title,suit,locationLabel,clue,hint,question,answer,qrToken:randomBytes(24).toString('base64url'),backupCode:`DEMO000${i+1}`,staffOnly:false,enabled:true}));
 return {stages,teams:['Wild Cards','Royal Flush','The Aces'].map((name,i)=>({id:randomUUID(),name,leaderName:['Alex','Sam','Noor'][i],size:3,accessHash:accessHash(`JH-DEMO-000${i+1}-TEAM`),startedAt:now(),finishedAt:null,startedPauseSeconds:0,finishedPauseSeconds:0,progress:stages.slice(0,2-i).map(s=>({stageId:s.id,verified:true,done:true,hint:false}))})),sessions:{},paused:false,pausedAt:null,pausedTotalSeconds:0,helpPhone:'',audit:[]};
}
let queue:Promise<unknown>=Promise.resolve();
export function localRequest(r:NextRequest):Promise<NextResponse>{
 const result=queue.then(()=>run(r));queue=result.catch(()=>{});return result;
}
async function run(r:NextRequest):Promise<NextResponse>{
 try{
  if(!['GET','HEAD'].includes(r.method)){
   const origin=r.headers.get('origin');
   if(r.headers.get('sec-fetch-site')==='cross-site'||origin&&origin!==r.nextUrl.origin)fail(403,'Invalid request origin.');
  }
  await mkdir(directory,{recursive:true,mode:0o700});
  let s:Store;try{s=JSON.parse(await readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;s=initial();}
  s.teams.forEach(t=>{t.memberNames||=[t.leaderName];});
  const route=r.nextUrl.pathname.replace('/api/local/','');
  let response:NextResponse|undefined;
  const json=(value:unknown)=>NextResponse.json(value,{headers:{'Cache-Control':'no-store'}});
  const log=(action:string,teamId?:string,reason?:string)=>s.audit.push({action,teamId,reason,at:now()});
  const session=(name:string)=>{const token=r.cookies.get(name)?.value;const v=token?s.sessions[hash(token)]:undefined;return v&&v.expires>Date.now()?v:undefined;};
  const isAdmin=()=>{if(!session('joker_admin')?.admin)fail(401,'Organizer login required.');};
  const teamAuth=()=>{const t=s.teams.find(t=>t.id===session('joker_team')?.teamId);if(!t)fail(401,'Register or rejoin a team.');return t!;};
  const ss=()=>s.stages.filter(v=>v.enabled).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));
  const current=(t:Team)=>ss().find(v=>!t.progress.some(p=>p.stageId===v.id&&p.done));
  const progress=(t:Team,id:string)=>{let p=t.progress.find(v=>v.stageId===id);if(!p){p={stageId:id,verified:false,done:false,hint:false};t.progress.push(p);}return p;};
  const complete=(t:Team,id:string)=>{const p=progress(t,id);p.verified=true;p.done=true;if(!current(t)){t.finishedAt=now();t.finishedPauseSeconds=s.pausedTotalSeconds;}};
  const active=()=>{if(s.paused)fail(423,'The hunt is paused.');};
  const loginCookie=(name:string,data:{teamId?:string;admin?:boolean})=>{const token=randomBytes(32).toString('base64url');s.sessions[hash(token)]={...data,expires:Date.now()+8*3600000};const res=json({ok:true});res.cookies.set(name,token,{httpOnly:true,sameSite:'lax',path:'/',maxAge:8*3600});return res;};
  const clear=(name:string)=>{const token=r.cookies.get(name)?.value;if(token)delete s.sessions[hash(token)];const res=json({ok:true});res.cookies.delete(name);return res;};
  let body:Record<string,unknown>={};
  if(r.method==='POST'){
   const reader=r.body?.getReader();if(!reader)fail(400,'JSON body required.');let size=0;const chunks:Uint8Array[]=[];
   while(true){const {done,value}=await reader!.read();if(done)break;size+=value.length;if(size>65536){await reader!.cancel();fail(413,'Request too large.');}chunks.push(value);}
   try{body=z.record(z.string(),z.unknown()).parse(JSON.parse(Buffer.concat(chunks).toString()));}catch{fail(400,'Invalid request.');}
  }
  const text=(name:string,min=1,max=400)=>z.string().trim().min(min).max(max).parse(body[name]);
  const rankings=()=>s.teams.map(t=>{const count=ss().filter(v=>t.progress.some(p=>p.stageId===v.id&&p.done)).length;return {name:t.name,stages:count,total:ss().length,finished:!!t.finishedAt&&count===ss().length,elapsedSeconds:t.finishedAt&&t.startedAt?Math.max(0,Math.round((+new Date(t.finishedAt)-+new Date(t.startedAt))/1000-t.finishedPauseSeconds+t.startedPauseSeconds)):null};}).sort((a,b)=>b.stages-a.stages||(a.elapsedSeconds??Infinity)-(b.elapsedSeconds??Infinity)||a.name.localeCompare(b.name)).map((t,i)=>({...t,rank:i+1}));
  if(route==='config')response=json({totalStages:ss().length,helpPhone:s.helpPhone});
  else if(route==='leaderboard')response=json({rows:rankings()});
  else if(route==='admin/session'){
   if(r.method==='POST'){
    if(!equal(text('email',1,254).toLowerCase(),'organizer@local.test')||!equal(text('password',1,1024),'JokerLocal!2026'))fail(401,'Use the local demo organizer account.');
    response=loginCookie('joker_admin',{admin:true});
   }else if(r.method==='DELETE')response=clear('joker_admin');else{isAdmin();response=json({ok:true});}
  }else if(route==='team/logout')response=clear('joker_team');
  else if(route==='team/register'){
   const name=text('teamName',2,45),leaderName=text('leaderName',2,70).replace(/\s+/g,' '),size=z.number().int().min(2).max(10).parse(body.size);
   if(s.teams.some(t=>t.name.toLowerCase()===name.toLowerCase()))fail(409,'That team name is taken.');
   const code=access(),t:Team={id:randomUUID(),name,leaderName,size,captainPhone:captainPhoneSchema.parse(body.captainPhone),memberNames:[leaderName],accessHash:accessHash(code),startedAt:null,finishedAt:null,progress:[],startedPauseSeconds:0,finishedPauseSeconds:0};s.teams.push(t);
   const cookie=loginCookie('joker_team',{teamId:t.id});response=json({ok:true,teamName:name,accessCode:code});response.headers.set('set-cookie',cookie.headers.get('set-cookie')!);
  }else if(route==='team/rejoin'){
   const name=text('teamName',2,45),code=text('accessCode',1,40),t=s.teams.find(t=>t.name.toLowerCase()===name.toLowerCase()&&t.accessHash===accessHash(code));
   if(!t)fail(401,'Team name or code is incorrect.');
   const member=text('memberName',2,70).replace(/\s+/g,' ');
   if(!t!.memberNames!.some(n=>n.toLowerCase()===member.toLowerCase())){if(t!.memberNames!.length>=t!.size)fail(409,'This team is full. Use your existing name to rejoin.');t!.memberNames!.push(member);}
   response=loginCookie('joker_team',{teamId:t!.id});
  }else if(route==='state'){
   const t=teamAuth(),stage=current(t),p=stage?progress(t,stage.id):null;
   response=json({team:{name:t.name,startedAt:t.startedAt,startedPauseSeconds:t.startedPauseSeconds,finishedAt:t.finishedAt},paused:s.paused,pausedAt:s.pausedAt,pausedTotalSeconds:s.pausedTotalSeconds,total:ss().length,notStarted:!t.startedAt,completed:ss().filter(v=>t.progress.some(p=>p.stageId===v.id&&p.done)).map((v)=>({id:v.id,title:v.title,suit:v.suit,position:ss().findIndex(x=>x.id===v.id)+1})),stage:t.startedAt&&stage?{id:stage.id,position:ss().findIndex(v=>v.id===stage.id)+1,title:stage.title,suit:stage.suit,clue:stage.clue,locationLabel:stage.locationLabel,staffOnly:stage.staffOnly,checkpointVerified:!!p?.verified,hintUsed:!!p?.hint,question:p?.verified?stage.question:null}:null});
  }else if(route==='team/start'){const t=teamAuth();active();if(!t.startedAt){t.startedAt=now();t.startedPauseSeconds=s.pausedTotalSeconds;}response=json({ok:true});}
  else if(['checkpoint','challenge','hint'].includes(route)){
   const t=teamAuth(),stage=current(t);if(!t.startedAt||!stage||stage.id!==body.stageId)fail(409,'Start your hunt and use your current stage.');
   const v=stage!,p=progress(t,v.id);
   if(route==='hint'){p.hint=true;response=json({hint:v.hint});}
   else {active();if(route==='checkpoint'){
    if(v.staffOnly)fail(403,'This checkpoint needs staff verification.');let value=text('value',1,300);try{value=new URL(value).searchParams.get('checkpoint')||value;}catch{}
    if(!equal(value.toUpperCase(),(body.method==='qr'?v.qrToken:v.backupCode).toUpperCase()))fail(400,'Incorrect checkpoint code.');p.verified=true;
   }else{if(!p.verified)fail(403,'Verify the checkpoint first.');if(!equal(text('answer',1,150).replace(/\s+/g,' ').toUpperCase(),v.answer.trim().replace(/\s+/g,' ').toUpperCase()))fail(400,'Not quite. Try again!');complete(t,v.id);}
   response=json({ok:true,message:route==='checkpoint'?'Checkpoint verified. Solve the puzzle!':'Card collected!'});}
  }else if(route.startsWith('admin/')){
   isAdmin();
   if(route==='admin/settings'){s.helpPhone=text('helpPhone',0,30);if(s.helpPhone&&(!/^\+?[0-9 ()-]{6,30}$/.test(s.helpPhone)||s.helpPhone.replace(/\D/g,'').length<6||s.helpPhone.replace(/\D/g,'').length>15))fail(400,'Enter a phone number.');response=json({ok:true});}
   else if(route==='admin/teams'){
    if(r.method==='POST'){
     const verb=text('action');if(verb==='pause'||verb==='resume'){
      if(verb==='pause'&&!s.paused){s.paused=true;s.pausedAt=now();}else if(verb==='resume'&&s.paused){s.pausedTotalSeconds+=Math.round((Date.now()-+new Date(s.pausedAt!))/1000);s.paused=false;s.pausedAt=null;}log(verb);response=json({ok:true});
     }else{
      const t=s.teams.find(t=>t.id===body.teamId);if(!t)fail(404,'Team not found.');
      if(verb==='prepareDelete'){const token=randomBytes(32).toString('base64url');s.sessions[hash(token)]={teamId:t!.id,expires:Date.now()+300000};response=json({confirmation:token});}
      else{const reason=text('reason',8);if(verb==='deleteTeam'){
       const token=text('confirmation'),pending=s.sessions[hash(token)];if(!pending||pending.expires<Date.now()||pending.teamId!==t!.id||body.confirmName!==t!.name)fail(400,'Confirmation does not match or expired.');
       s.teams=s.teams.filter(v=>v.id!==t!.id);for(const [k,v]of Object.entries(s.sessions))if(v.teamId===t!.id)delete s.sessions[k];response=json({ok:true});
      }else if(verb==='resetAccess'){const code=access();t!.accessHash=accessHash(code);for(const [k,v]of Object.entries(s.sessions))if(v.teamId===t!.id)delete s.sessions[k];response=json({ok:true,accessCode:code});}
      else if(verb==='staffVerify'||verb==='unblock'){const stage=current(t!);if(!stage||stage.id!==body.stageId||!t!.startedAt)fail(409,'Choose the current stage of a started team.');if(verb==='unblock'){active();complete(t!,stage!.id);}else progress(t!,stage!.id).verified=true;response=json({ok:true});}
      else fail(400,'Unknown action.');log(verb,t!.id,reason);}
     }
    }else response=json({paused:s.paused,helpPhone:s.helpPhone,teams:s.teams.map(t=>({...t,accessHash:undefined,progress:undefined,completed:t.progress.filter(p=>p.done&&ss().some(v=>v.id===p.stageId)).length,checkpointVerified:t.progress.filter(p=>p.verified&&!p.done).map(p=>p.stageId),currentStageId:current(t)?.id||null}))});
   }else if(route==='admin/stages'){
    if(r.method==='POST'){
     const verb=text('action');
     if(verb==='create'||verb==='update'){
      const v=z.object({title:z.string().min(2).max(65),suit:z.enum(['♠','♥','♦','♣','★']),locationLabel:z.string().min(2).max(110),clue:z.string().min(5).max(1200),hint:z.string().min(3).max(600),question:z.string().min(5).max(1200),answer:z.string().max(150).optional(),staffOnly:z.boolean(),enabled:z.boolean(),position:z.number().int().min(1).max(500)}).parse(body.stage);
      if(verb==='create'){if(!v.answer)fail(400,'Answer required.');s.stages.push({...v,id:randomUUID(),answer:v.answer!,qrToken:randomBytes(24).toString('base64url'),backupCode:randomBytes(4).toString('hex').toUpperCase()});}
      else{const old=s.stages.find(v=>v.id===body.id);if(!old)fail(404,'Stage not found.');Object.assign(old!,v,{answer:v.answer||old!.answer});}
     }else if(verb==='reorder'){const ids=z.array(z.string()).parse(body.ids);if(ids.length!==s.stages.length||new Set(ids).size!==ids.length||s.stages.some(v=>!ids.includes(v.id)))fail(400,'Include every stage once.');ids.forEach((id,i)=>s.stages.find(v=>v.id===id)!.position=i+1);}
     else{const v=s.stages.find(v=>v.id===body.id);if(!v)fail(404,'Stage not found.');if(verb==='delete'){if(s.teams.some(t=>t.progress.some(p=>p.stageId===v!.id)))fail(409,'Teams have progress here. Disable this stage instead.');s.stages=s.stages.filter(x=>x.id!==v!.id);}else if(verb==='rotateQr')v!.qrToken=randomBytes(24).toString('base64url');else if(verb==='rotateBackup')v!.backupCode=randomBytes(4).toString('hex').toUpperCase();else fail(400,'Unknown action.');}
     log(verb);
    }response=json({stages:s.stages});
   }else if(route==='admin/export'){
    const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"';response=new NextResponse('\ufeff'+[['Rank','Team','Cards','Total'],...rankings().map(t=>[t.rank,t.name,t.stages,t.total])].map(row=>row.map(cell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="local-leaderboard.csv"'}});
   }
  }
  if(!response)fail(404,'Not found.');
  await writeFile(file+'.tmp',JSON.stringify(s),{mode:0o600});await rename(file+'.tmp',file);
  return response!;
 }catch(e){const err=e as Error&{status?:number;issues?:unknown};return NextResponse.json({error:err.issues?'Check the fields and try again.':err.status?err.message:'Local preview error. Please try again.'},{status:err.status|| (err.issues?400:500)});}
}
