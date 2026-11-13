'use client';
import { useCallback,useEffect,useState } from 'react';
import { Maximize,Minimize,ArrowLeft,Trophy,RefreshCw } from 'lucide-react';
import { HuntMark,LeaderboardArtwork,CourtArtwork,JokerArtwork } from './HuntArtwork';
type Row={rank:number;name:string;stages:number;total:number;finished:boolean;elapsedSeconds:number|null};
const time=(seconds:number)=>{const s=Math.max(0,Math.floor(seconds));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');};
export default function LiveLeaderboard(){
 const [rows,setRows]=useState<Row[]>([]),[ready,setReady]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[updated,setUpdated]=useState(''),[paused,setPaused]=useState(false),[page,setPage]=useState(0),[size]=useState(10),[full,setFull]=useState(false);
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const r=await fetch('/api/admin/leaderboard',{cache:'no-store',signal});
   if(r.status===401||r.status===403){setRows([]);setLocked(true);setReady(false);return;}
   if(!r.ok)throw Error('Live connection interrupted — retrying.');
   const d=await r.json();setRows(d.rows||[]);setPaused(!!d.paused);setUpdated(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}));setError('');setReady(true);setLocked(false);
  }catch(e){if((e as Error).name!=='AbortError')setError('Live connection interrupted — retrying.');}
 },[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);const i=setInterval(()=>void load(c.signal),5000);return()=>{c.abort();clearInterval(i);};},[load]);
 useEffect(()=>{const changed=()=>setFull(!!document.fullscreenElement);document.addEventListener('fullscreenchange',changed);return()=>{document.removeEventListener('fullscreenchange',changed);};},[]);
 const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.min(page,pages-1);
 useEffect(()=>{setPage(0);const t=setInterval(()=>setPage(p=>(p+1)%pages),12000);return()=>clearInterval(t);},[pages]);
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setError('Fullscreen unavailable here. Open this page in a browser tab or use its fullscreen menu.');}}
 if(locked)return <div className="screen-gate"><HuntMark size={60}/><h1>Organizer sign-in required</h1><p>Sign in again to open the live display.</p><a className="btn btn-yellow" href="/admin">Organizer login</a></div>;
 return <div className="live-screen">
  <header className="screen-header"><div className="screen-brand"><HuntMark size={48}/><span>THE JOKER&apos;S HUNT</span></div><div className="screen-controls"><a href="/admin" aria-label="Back to organizer dashboard"><ArrowLeft size={18}/></a><button onClick={()=>void load()} aria-label="Refresh standings"><RefreshCw size={18}/></button><button onClick={()=>void fullscreen()}>{full?<Minimize size={18}/>:<Maximize size={18}/>}<span>{full?'Exit fullscreen':'Fullscreen'}</span></button></div></header>
  <section className="screen-title"><div><p className="screen-live"><i/>{paused?'HUNT PAUSED':'LIVE STANDINGS'}</p><h1>WHO HOLDS<br/>THE <em>WINNING HAND?</em></h1></div><div className="screen-title-art" aria-hidden="true"><span className="screen-spark">✦</span><div className="screen-court queen"><CourtArtwork rank="Q" suit="♠"/></div><div className="screen-court king"><CourtArtwork rank="K" suit="♦"/></div><div className="screen-court joker"><JokerArtwork decorative/></div><div className="screen-prize"><LeaderboardArtwork/></div></div></section>
  <div className="screen-summary"><span><b>{ready?rows.length:'—'}</b> TEAMS IN THE HUNT</span><span><b>{ready?rows.filter(r=>r.finished).length:'—'}</b> FINISHED</span><span className="screen-top-label">{current===0?'TOP 10':`PLACES ${current*size+1}–${(current+1)*size}`} <i>♠ ♦ ♣ ♥</i></span></div>
  {!ready?<div className="screen-empty">{error||'Shuffling the standings…'}</div>:rows.length===0?<div className="screen-empty"><Trophy size={55}/><h2>The deck is waiting.</h2><p>Registered teams will appear here automatically.</p></div>:<div className="screen-standings" role="table" aria-label="Live team standings">
   <div className="screen-table-heading" role="row"><span role="columnheader">RANK</span><span role="columnheader">TEAM</span><span role="columnheader">CARDS COLLECTED</span><span role="columnheader">FINISH TIME</span></div>
   <div key={current} className="screen-rows">{rows.slice(current*size,(current+1)*size).map(r=><div role="row" key={r.name} className={'screen-row '+(r.rank===1?'screen-leading':'')}><span role="cell" className="screen-rank">{String(r.rank).padStart(2,'0')}</span><strong role="cell" title={r.name}>{r.name}{r.rank===1&&<Trophy size={22}/>}</strong><div role="cell" className="screen-progress"><div className="screen-track"><i style={{width:(r.total?r.stages/r.total*100:0)+'%'}}/></div><span>{r.stages} / {r.total}</span></div><span role="cell" className="screen-time">{r.elapsedSeconds!==null?time(r.elapsedSeconds):r.finished?'Finished':'In play'}</span></div>)}{Array.from({length:Math.max(0,size-rows.slice(current*size,(current+1)*size).length)},(_,i)=>{const rank=current*size+rows.slice(current*size,(current+1)*size).length+i+1;return <div role="row" key={'waiting-'+rank} className="screen-row screen-waiting"><span role="cell" className="screen-rank">{String(rank).padStart(2,'0')}</span><span role="cell">Awaiting team</span><span role="cell">—</span><span role="cell" className="screen-time">—</span></div>;})}</div>
  </div>}
  <footer className="screen-footer"><span>{error|| (updated?'Updated '+updated:'Connecting…')}</span><div>{pages>1&&<><button onClick={()=>setPage(p=>(p-1+pages)%pages)} aria-label="Previous standings page">←</button><span>{current+1} / {pages} · rotates automatically</span><button onClick={()=>setPage(p=>(p+1)%pages)} aria-label="Next standings page">→</button></>}</div><span>♠ ♥ ♦ ♣</span></footer>
 </div>;
}
