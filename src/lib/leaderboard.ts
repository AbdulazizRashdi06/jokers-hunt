import 'server-only';
import { db,assertDb } from './server';
type TeamRow={
 id:string;name:string;started_at:string|null;started_pause_seconds:number|null;
 finished_at:string|null;finished_pause_seconds:number|null
};
type ProgressRow={team_id:string;stage_id:string;completed_at:string};

export async function getLeaderboard(){
 // Supabase queries default to 1000 rows. Paginate so 200 teams x 5 stages
 // does not silently truncate the leaderboard.
 const teams:TeamRow[]=[];
 for(let offset=0;offset<100000;offset+=1000){
  const {data,error}=await db.from('teams')
   .select('id,name,started_at,started_pause_seconds,finished_at,finished_pause_seconds')
   .order('id').range(offset,offset+999);
  assertDb(error);teams.push(...(data||[]));
  if((data||[]).length<1000)break;
 }
 const progress:ProgressRow[]=[];
 for(let offset=0;offset<100000;offset+=1000){
  const {data,error}=await db.from('stage_progress')
   .select('team_id,stage_id,completed_at').not('completed_at','is',null)
   .order('team_id').order('stage_id').range(offset,offset+999);
  assertDb(error);progress.push(...(data||[]) as ProgressRow[]);
  if((data||[]).length<1000)break;
 }
 const {data:ss,error:se}=await db.from('stages').select('id').eq('enabled',true);
 assertDb(se);
 const total=(ss||[]).length;
 const validStages=new Set((ss||[]).map(s=>s.id));
 const counts=new Map<string,{count:number;last:string|null}>();
 for(const x of progress){
  if(!validStages.has(x.stage_id))continue;
  const v=counts.get(x.team_id)||{count:0,last:null};
  v.count++;if(!v.last||x.completed_at>v.last)v.last=x.completed_at;
  counts.set(x.team_id,v);
 }
 return teams.map(t=>{
  const v=counts.get(t.id)||{count:0,last:null};
  const finishedAt=v.count>=total&&total>0?t.finished_at:null;
  return {
   name:t.name,stages:Math.min(v.count,total),finishedAt,
   elapsedSeconds:finishedAt&&t.started_at?Math.max(0,Math.round(
    (new Date(finishedAt).getTime()-new Date(t.started_at).getTime())/1000
    -(t.finished_pause_seconds||0)+(t.started_pause_seconds||0)
   )):null,
   lastCompletedAt:v.last
  };
 }).sort((a,b)=>
  b.stages-a.stages ||
  (a.elapsedSeconds!==null&&b.elapsedSeconds!==null?a.elapsedSeconds-b.elapsedSeconds:0) ||
  ((a.lastCompletedAt?new Date(a.lastCompletedAt).getTime():Infinity)-
   (b.lastCompletedAt?new Date(b.lastCompletedAt).getTime():Infinity)) ||
  a.name.localeCompare(b.name)
 ).map((x,i)=>({
  rank:i+1,name:x.name,stages:x.stages,elapsedSeconds:x.elapsedSeconds,
  finished:!!x.finishedAt,total
 }));
}
