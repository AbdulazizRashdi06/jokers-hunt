'use client';

import { useState,useEffect,useCallback,useMemo } from 'react';
import {
 ArrowRight,ArrowUpRight,Check,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Copy,Eye,Flag,
 HelpCircle,LockKeyhole,LogOut,Minus,Plus,RefreshCw,ScanLine,ShieldCheck,Sparkles,Trophy,X
} from 'lucide-react';
import { flushSync } from 'react-dom';
import QrScanner from '@/components/QrScanner';
import { JokerArtwork } from '@/components/HuntArtwork';
import { HuntDialog,HuntHeader,HuntStory,HuntTabs,suits,type HuntOverlay,type HuntView } from '@/components/HuntIntro';

type Stage={
 id:string;position:number;title:string;suit:string;clue:string;locationLabel:string;
 staffOnly:boolean;checkpointVerified:boolean;hintUsed:boolean;question:string|null
};
type Game={
 team:{name:string;startedAt:string|null;startedPauseSeconds:number;finishedAt:string|null};
 paused:boolean;pausedAt:string|null;pausedTotalSeconds:number;
 notStarted:boolean;total:number;
 completed:{id:string;title:string;suit:string;position:number}[];
 stage:Stage|null
};
type Rank={rank:number;name:string;stages:number;finished:boolean;elapsedSeconds:number|null;total:number};
const pads=(n:number)=>String(n).padStart(2,'0');
function duration(sec:number) {
 const t=Math.max(0,Math.floor(sec));return `${pads(Math.floor(t/3600))}:${pads(Math.floor(t/60)%60)}:${pads(t%60)}`;
}
async function send(url:string,body:unknown,method='POST'){
 const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const data=await r.json().catch(()=>({error:'Unexpected server response.'}));
 if(!r.ok)throw new Error(data.error||'Something went wrong. Please try again.');
 return data;
}
function Card({suit,index,complete,active}:{
 suit:string;index:number;complete:boolean;active:boolean
}){
 const mark=suit.endsWith('\uFE0E')?suit:suit+'\uFE0E';
 return <div className={`collectible ${complete?'collected':''} ${active?'active':''}`} aria-hidden>
  <div className="collectible-inner">
   <div className="card-face card-back"><span className="corner-small">J</span>
    <span className="back-emblem">✦<br/><span>JOKER</span></span><span className="corner-small bottom">J</span>
   </div>
   <div className="card-face card-front"><span className="card-rank">{index+1}<small>{mark}</small></span>
    <span className="card-suit">{mark}</span>
    <span className="card-rank lower">{index+1}<small>{mark}</small></span></div>
  </div>
 </div>;
}
function Confetti(){return <div className="confetti-field" aria-hidden>
 {Array.from({length:48},(_,i)=><i key={i} style={{
  '--x':`${(i*37)%100}%`,'--delay':`${(i*13)%18/10}s`,
  '--fall':`${3+(i%5)*0.4}s`,'--rotate':`${i*61}deg`
 } as React.CSSProperties}/>)}
 </div>}
export default function Home(){
 const [view,updateView]=useState<HuntView>('home'),[game,setGame]=useState<Game|null>(null),
 [loading,setLoading]=useState(true),[serverError,setServerError]=useState(''),
 [helpPhone,setHelpPhone]=useState(''),
 [publicStageCount,setPublicStageCount]=useState(5),
 [ranks,setRanks]=useState<Rank[]>([]),[registerMode,setRegisterMode]=useState<'new'|'rejoin'>('new'),
 [name,setName]=useState(''),[leader,setLeader]=useState(''),[size,setSize]=useState(3),
 [accessInput,setAccessInput]=useState(''),[newCode,setNewCode]=useState(''),
 [working,setWorking]=useState(false),[notice,setNotice]=useState(''),
 [scanning,setScanning]=useState(false),[codeInput,setCodeInput]=useState(''),
 [scanned,setScanned]=useState(''),[answer,setAnswer]=useState(''),
 [hint,setHint]=useState(''),[clock,setClock]=useState(Date.now()),
 [overlay,setOverlay]=useState<HuntOverlay|null>(null),[formError,setFormError]=useState(''),
 [copied,setCopied]=useState(false),[rankPage,setRankPage]=useState(0);
 function setView(next:HuntView){
  if(next===view)return;
  const doc=document as Document & {startViewTransition?:(callback:()=>void)=>{finished:Promise<void>}};
  if(doc.startViewTransition&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   const transition=doc.startViewTransition(()=>flushSync(()=>updateView(next)));
   void transition.finished.catch(()=>{});
  }else updateView(next);
 }
 const refresh=useCallback(async()=>{
  const res=await fetch('/api/state',{cache:'no-store'}).catch(()=>null);
  if(!res){setServerError('Could not connect to the game.');setLoading(false);return;}
  if(res.status===401){setGame(null);setServerError('');setLoading(false);return;}
  const data=await res.json().catch(()=>({error:'Could not read the server response.'}));
  if(!res.ok){setServerError(data.error||'Backend unavailable.');setLoading(false);return;}
  setGame(data);setServerError('');setLoading(false);
 },[]);
 useEffect(()=>{void refresh();
  fetch('/api/config').then(r=>r.json()).then(d=>{
   if(typeof d.helpPhone==='string')setHelpPhone(d.helpPhone);
   if(typeof d.totalStages==='number'&&d.totalStages>0)setPublicStageCount(d.totalStages);
  }).catch(()=>{});
 },[refresh]);
 useEffect(()=>{
  if(view!=='game'||!game?.team.startedAt||game.team.finishedAt||game.paused)return;
  setClock(Date.now());
  const timer=setInterval(()=>setClock(Date.now()),1000);
  return()=>clearInterval(timer);
 },[view,game?.team.startedAt,game?.team.finishedAt,game?.paused]);
 // Keep the pause state and organizer recovery decisions current on open game screens.
 useEffect(()=>{
  if(!game||view!=='game')return;
  const timer=setInterval(()=>void refresh(),10000);
  return()=>clearInterval(timer);
 },[!!game,view,refresh]);
 useEffect(()=>{
  if(view==='leaderboard'){
   let stopped=false;
   const load=async()=>{try{
    const r=await fetch('/api/leaderboard',{cache:'no-store'});
    if(!r.ok)throw new Error();
    const d=await r.json();if(!stopped)setRanks(d.rows||[]);
   }catch{if(!stopped)setNotice('Leaderboard unavailable; try again soon.');}};
   void load();const interval=setInterval(load,15000);
   return()=>{stopped=true;clearInterval(interval);};
  }
 },[view]);
 useEffect(()=>{
  const qs=new URLSearchParams(window.location.search);
  if(qs.get('checkpoint')){setScanned(qs.get('checkpoint')||'');setView('game');
   const st=qs.get('stage');if(st)sessionStorage.setItem('qr-stage',st);
   window.history.replaceState(null,'',window.location.pathname);}
 },[]);
 useEffect(()=>{setHint('');setAnswer('');setCodeInput('');},[game?.stage?.id]);
 async function register(){
  setFormError('');
  if(name.trim().length<2){
   setFormError(name.trim()?'Use at least two characters for your team name.':'Give your team a name first.');
   return;
  }
  if(registerMode==='new'&&leader.trim().length<2){
   setFormError(leader.trim()?'Use at least two characters for the team leader.':'Add the team leader’s name.');
   return;
  }
  if(registerMode==='rejoin'&&!accessInput.trim()){
   setFormError('Enter your rejoin code.');
   return;
  }
  setWorking(true);
  try{
   const data=await send(registerMode==='new'?'/api/team/register':'/api/team/rejoin',
    registerMode==='new'?{teamName:name,leaderName:leader,size}:
    {teamName:name,accessCode:accessInput});
   await refresh();
   if(data.accessCode)setNewCode(data.accessCode);
   else {setAccessInput('');setView('game');setNotice('Your team is back in the game!');}
  }catch(e){setFormError((e as Error).message);}
  finally{setWorking(false);}
 }
 async function verify(value:string,method:'qr'|'backup'){
  if(!game?.stage)return;
  setWorking(true);setNotice('');
  try{
   const data=await send('/api/checkpoint',{stageId:game.stage.id,value,method});
   await refresh();setNotice(data.message);setScanned('');setCodeInput('');sessionStorage.removeItem('qr-stage');
  }catch(e){setNotice((e as Error).message);}
  finally{setWorking(false);}
 }
 const onScan=useCallback((qr:string)=>{
  setScanning(false);setScanned(qr);
  try{const url=new URL(qr);const id=url.searchParams.get('stage');if(id)sessionStorage.setItem('qr-stage',id);else sessionStorage.removeItem('qr-stage');}
  catch{sessionStorage.removeItem('qr-stage');}
  setNotice('Joker mark detected! Tap Verify QR to open the puzzle.');
 },[]);
 async function solve(){
  if(!game?.stage)return;
  setWorking(true);setNotice('');
  try{
   const res=await send('/api/challenge',{stageId:game.stage.id,answer});
   await refresh();setAnswer('');setNotice(res.message);
  }catch(e){setNotice((e as Error).message);}
  finally{setWorking(false);}
 }
 async function showHint(){
  if(!game?.stage)return;
  try{const v=await send('/api/hint',{stageId:game.stage.id});setHint(v.hint);}
  catch(e){setNotice((e as Error).message);}
 }
 async function startHunt(){
  setWorking(true);setNotice('');
  try{await send('/api/team/start',{});await refresh();setNotice('The clock is ticking. Let the games begin!');}
  catch(e){setNotice((e as Error).message);}
  finally{setWorking(false);}
 }
 async function logout(){
  try{await send('/api/team/logout',{});setGame(null);setNewCode('');setNotice('');setView('home');}
  catch(e){setNotice((e as Error).message);}
 }
 useEffect(()=>{
  if(!copied)return;
  const timer=setTimeout(()=>setCopied(false),1600);
  return()=>clearTimeout(timer);
 },[copied]);
 async function copyCode(){
  try{await navigator.clipboard.writeText(newCode);setCopied(true);setFormError('');}
  catch{setFormError('Could not copy automatically. Select and copy the code above.');}
 }
 async function resetRegistration(){
  setWorking(true);setFormError('');setNotice('');
  try{
   await send('/api/team/logout',{});
   setGame(null);setNewCode('');setName('');setLeader('');setAccessInput('');
   setSize(3);setRegisterMode('new');setCopied(false);
  }catch(err){setFormError((err as Error).message);}
  finally{setWorking(false);}
 }
 const joinHunt=()=>setView(game&&!newCode?'game':'register');
 const rankPages=Math.max(1,Math.ceil(ranks.length/5));
 const currentRankPage=Math.min(rankPage,rankPages-1);
 const elapsed=game?.team.startedAt?duration(
  ((game.paused&&game.pausedAt?new Date(game.pausedAt).getTime():clock)-
  new Date(game.team.startedAt).getTime())/1000
  -game.pausedTotalSeconds+game.team.startedPauseSeconds
 ):'00:00:00';
 const complete=!!game&&!game.notStarted&&!game.stage&&game.total>0;
 const fill=game&&game.total?Math.round((game.completed.length/game.total)*100):0;
 const qrStageMatch=!game?.stage||!sessionStorageSafe('qr-stage')||sessionStorageSafe('qr-stage')===game.stage.id;
 const collection=useMemo(()=>Array.from({length:game?.total||5},(_,i)=>{
  const collected=game?.completed.find(s=>s.position===i+1);
  const active=game?.stage?.position===i+1;
  return {index:i,done:!!collected,active,suit:collected?.suit||(active?game?.stage?.suit:suits[i%suits.length])||'★'};
 }),[game]);
 return <div className="hunt-app">
  <HuntHeader onStory={() => setView('home')} onOrganizer={() => setOverlay('organizer')}/>
  <main key={view} className={'hunt-main hunt-main-' + view}>
  {view==='home'&&<HuntStory joined={!!game && !newCode} count={publicStageCount} onJoin={joinHunt} onOverlay={setOverlay}/>}

  {view==='register'&&<section className="hunt-join hunt-grid">
   <div className="join-frame">
    <div className="join-heading">
     <p className="hunt-label"><span aria-hidden>♠︎</span> PLAY YOUR HAND</p>
     <h1>EVERY GREAT HUNT<br/>STARTS WITH A <em>TEAM.</em></h1>
    </div>
    <div className="join-card">
     {newCode ? <div className="join-success">
      <p className="hunt-label"><span aria-hidden>★︎</span> YOU&apos;RE IN THE GAME</p>
      <h2>{game?.team.name || name.trim()}</h2>
      <p>{size} players. Save this rejoin code somewhere safe. You&apos;ll need it to get back in.</p>
      <div className="join-code"><strong>{newCode}</strong><button type="button" onClick={() => void copyCode()}>
       {copied ? <Check size={16} aria-hidden/> : <Copy size={16} aria-hidden/>}{copied ? 'COPIED' : 'COPY'}
      </button></div>
      {formError && <p className="hunt-error" role="alert">{formError}</p>}
      <button className="hunt-button hunt-yellow" onClick={() => { setNewCode(''); setView('game'); }}>
       CONTINUE TO MY HUNT <ArrowRight size={18} aria-hidden/>
      </button>
      <button className="hunt-button hunt-outline" onClick={() => setView('leaderboard')}>SEE THE LEADERBOARD <Trophy size={17} aria-hidden/></button>
      <button className="join-reset" disabled={working} onClick={() => void resetRegistration()}>Start over with a new team</button>
     </div> : <>
      <h2>ASSEMBLE YOUR CREW.</h2>
      <div className="join-segment" role="group" aria-label="Team access">
       <button aria-pressed={registerMode==='new'} onClick={() => { setRegisterMode('new'); setFormError(''); }}>New team</button>
       <button aria-pressed={registerMode==='rejoin'} onClick={() => { setRegisterMode('rejoin'); setFormError(''); }}>Rejoin a team</button>
      </div>
      <form className="hunt-form" noValidate onSubmit={event => { event.preventDefault(); void register(); }}>
       <label>TEAM NAME<input value={name} onChange={event => { setName(event.target.value); setFormError(''); }} placeholder="The Wild Cards" maxLength={45}/></label>
       {registerMode==='new' ? <>
        <label>TEAM LEADER&apos;S NAME<input value={leader} onChange={event => { setLeader(event.target.value); setFormError(''); }} placeholder="Your name" maxLength={70} autoComplete="name"/></label>
        <div className="join-player-row">
         <span id="join-player-label">NUMBER OF PLAYERS</span>
         <div className="join-stepper" role="group" aria-labelledby="join-player-label">
          <button type="button" aria-label="Remove one player" disabled={size<=2} onClick={() => setSize(size-1)}><Minus size={18} aria-hidden/></button>
          <output aria-live="polite" aria-label="Players">{size}</output>
          <button type="button" aria-label="Add one player" disabled={size>=10} onClick={() => setSize(size+1)}><Plus size={18} aria-hidden/></button>
         </div>
        </div>
       </> : <label>REJOIN CODE<input className="join-rejoin-code" value={accessInput} onChange={event => { setAccessInput(event.target.value.toUpperCase()); setFormError(''); }}
        placeholder="JH-XXXX-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false}/></label>}
       <button className="hunt-button hunt-blue" disabled={working} type="submit">
        {working ? 'ONE MOMENT…' : registerMode==='new' ? 'CREATE MY TEAM' : 'REJOIN MY TEAM'} <ArrowRight size={18} aria-hidden/>
       </button>
       {formError ? <p className="hunt-error" role="alert">{formError}</p>
        : <p className="join-privacy"><ShieldCheck size={16} aria-hidden/> Your leader&apos;s name and team access code are never shown on the leaderboard.</p>}
      </form>
     </>}
    </div>
   </div>
  </section>}
  {view==='game'&&<section className="inner-page game-page">
   <div className="layout-wide">
    {!game?<div className="empty-state"><span>♠</span><h2>YOUR HAND IS EMPTY.</h2><p>You need a team before the cards can be dealt.</p>
      <button className="btn btn-yellow" onClick={()=>setView('register')}>Register or rejoin <ArrowRight/></button></div>
    :complete?<div className="victory">
      <Confetti/><div className="victory-star">★</div>
      <span className="eyebrow">♠ ♥ ♦ ♣ ★ · ALL CARDS COLLECTED</span>
      <h1>YOU&apos;VE OUTSMARTED<br/><em>THE JOKER!</em></h1>
      <p>The Joker tips his hat. <b>{game.team.name}</b>, the deck never stood a chance.</p>
      <div className="final-reveal-wrap" aria-label="The Joker has been revealed">
       <div className="final-reveal-card">
        <div className="final-face final-back"><span>J</span><strong>✦</strong><small>THE FINAL CARD</small></div>
        <div className="final-face final-front"><div className="final-art">
         <JokerArtwork/>
        </div><b>THE JOKER</b><small>♠ ♥ ♦ ♣ ★</small></div>
       </div>
      </div>
      <div className="victory-certificate" id="certificate">
       <div className="certificate-corners"><span>J ♠</span><span>★</span></div>
       <div className="victory-medal">🃏</div>
       <span className="certificate-kicker">OFFICIAL JOKER&apos;S HUNT · 08 DEC 2026</span>
       <h2>MASTER OF THE DECK</h2><div className="certificate-team">{game.team.name}</div>
       <p>Has collected all {game.total} mystery cards and defeated the Joker.</p>
       <span className="certificate-footer">GUvoices × German Festival · Debate Club</span>
      </div>
      <div className="victory-actions">
       <button className="btn btn-yellow" onClick={()=>window.print()}>Print my victory card <ArrowUpRight size={18}/></button>
       <button className="btn btn-outline" onClick={()=>setView('leaderboard')}>See leaderboard <Trophy size={18}/></button>
      </div>
    </div>:<div className="dashboard">
     <div className="dashboard-header">
      <div><span className="eyebrow">WELCOME TO THE GAME,</span>
       <h1>{game.team.name}<span> ✦</span></h1>
       <p>The Joker has a new challenge waiting for you.</p></div>
      <div className="game-timer"><Clock3 size={18}/><div><small>YOUR HUNT TIME</small><strong>{elapsed}</strong></div></div>
     </div>
     {game.paused&&<div className="paused-banner"><LockKeyhole/> The game is paused by the organizers. You can review your clues, but cannot advance yet.</div>}
     <div className="dashboard-grid">
      <div className="dashboard-main">
       <div className="collection-panel">
        <div className="collection-header"><div><span className="eyebrow dark-kicker">YOUR COLLECTION</span><h2>THE {game.total}-CARD CHALLENGE</h2></div>
         <span className="completion-count">{game.completed.length} / {game.total} COLLECTED</span></div>
        <div className="progress-track"><div style={{width:`${fill}%`}}/></div>
        <div className="cards-row">{collection.map(c=><div key={c.index} className="card-slot">
         <Card index={c.index} suit={c.suit} complete={c.done} active={c.active}/>
         <span>{c.done?'FOUND':c.active?'IN PLAY':'LOCKED'}</span>
        </div>)}</div>
       </div>
       {game.notStarted&&<div className="start-panel">
        <span className="eyebrow dark-kicker">★ YOUR DECK IS READY</span>
        <h2>READY TO START THE CLOCK?</h2>
        <p>Your team is registered, but the timer has not begun. When everyone is ready at GUtech, start the hunt to reveal your first clue. This keeps early registration from adding hours to your time.</p>
        <button className="btn btn-yellow" disabled={working||game.paused} onClick={()=>void startHunt()}>
         {working?'Preparing the deck…':'Begin the hunt'} <ArrowRight size={19}/></button>
       </div>}
       {game.stage&&<div className="stage-panel">
        <div className="stage-head"><div className="stage-number">0{game.stage.position}</div>
         <div><span className="eyebrow">YOUR CURRENT MISSION</span><h2>{game.stage.title}</h2></div>
        <div className="stage-suit" aria-hidden>{game.stage.suit+'\uFE0E'}</div></div>
        <div className="clue-box"><span><Eye size={18}/> THE JOKER&apos;S CLUE</span><p>“{game.stage.clue}”</p></div>
        <div className="location-line"><Flag size={19}/><span>{game.stage.locationLabel}</span></div>
        {!game.stage.checkpointVerified?<div className="checkpoint-area">
         <div className="checkpoint-title"><ScanLine/><div><h3>FIND THE CHECKPOINT.</h3>
          <p>{game.stage.staffOnly?'This stage needs an organizer to verify your arrival.':"Spot the Joker QR at your location. Can't scan it? Use the printed backup code."}</p></div></div>
         {!game.stage.staffOnly&&<>
          <div className="scan-actions">
           <button className="btn btn-blue" onClick={()=>setScanning(true)}><ScanLine size={20}/> Scan QR with camera</button>
           {scanned&&<button className="btn btn-yellow" disabled={working||!qrStageMatch} onClick={()=>void verify(scanned,'qr')}>
            <Check size={17}/> Verify scanned QR</button>}
          </div>
          {scanned&&!qrStageMatch&&<p className="error-note">This QR belongs to another stage. Find your current checkpoint.</p>}
          <div className="or-divider">OR USE THE BACKUP CODE</div>
          <form onSubmit={e=>{e.preventDefault();void verify(codeInput,'backup');}} className="code-row">
           <input value={codeInput} onChange={e=>setCodeInput(e.target.value)} placeholder="8-character backup code" maxLength={20} aria-label="Checkpoint backup code"/>
           <button className="btn btn-blue" disabled={working||!codeInput.trim()}>Verify <ArrowRight size={17}/></button>
          </form>
         </>}
         <p className="help-text"><HelpCircle size={17}/> Missing or damaged QR? Ask a checkpoint staff member for manual verification. No team gets permanently stuck.</p>
        </div>:<div className="challenge-panel">
         <div className="challenge-unlocked"><CheckCircle2 size={18}/> CHECKPOINT VERIFIED · PUZZLE UNLOCKED</div>
         <span className="eyebrow">THE JOKER ASKS…</span>
         <h3>{game.stage.question}</h3>
         <form onSubmit={e=>{e.preventDefault();void solve();}} className="answer-row">
          <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Your answer goes here…" aria-label="Your puzzle answer" maxLength={150} required/>
          <button className="btn btn-yellow" disabled={working||game.paused}>Submit answer <ArrowRight size={19}/></button>
         </form>
        </div>}
       </div>}
      </div>
      <aside className="game-sidebar">
       <div className="joker-says"><div className="speech-icon">J<span>★</span></div><span className="eyebrow">A WORD FROM THE JOKER</span>
        <h3>“{game.stage?.checkpointVerified?'You found my checkpoint. But can you solve my puzzle?':'Ah, a fresh contender. Every card hides a little secret.'}”</h3>
        <span className="joker-sign">— THE JOKER</span></div>
       <div className="side-hint"><span className="eyebrow dark-kicker">STUCK ON A CLUE?</span><h3>NEED A LITTLE NUDGE?</h3>
        {hint?<p className="revealed-hint">{hint}</p>:<p>Even the sharpest minds sometimes need a hint from the deck.</p>}
        <button className="btn btn-outline full" onClick={()=>void showHint()} disabled={!game.stage}><Sparkles size={18}/>{hint?'Read the hint again':'Reveal a hint'}</button>
       </div>
       <button className="text-link logout-link" onClick={()=>void logout()}><LogOut size={15}/> Leave this device / switch team</button>
      </aside>
     </div>
    </div>}
   </div>
  </section>}

  {view==='leaderboard'&&<section className="hunt-rankings">
   <div className="rank-frame">
    <div className="rank-hero">
     <div><p className="hunt-label">THE GAME IS AFOOT</p><h1>THE<br/><em>LEADER<br/>BOARD.</em></h1></div>
     <div className="rank-trophy" aria-hidden><Trophy size={47}/><span>✦</span></div>
    </div>
    <p className="rank-intro">Who is playing the strongest hand? Team names only; private details stay private.</p>
    <div className="rank-card">
     <table className="rank-table">
      <caption className="sr-only">Team standings</caption>
      <thead><tr><th scope="col">RANK</th><th scope="col">TEAM</th><th scope="col">CARDS</th><th scope="col">FINISH</th></tr></thead>
      <tbody>
       {ranks.length===0 ? <tr><td colSpan={4}><div className="hunt-rank-empty">
        <Trophy size={26} aria-hidden/><h2>THE DECK IS STILL SHUFFLING.</h2>
        <p>No teams to rank yet. Be the first to make your mark!</p>
        <button className="hunt-button hunt-yellow" onClick={joinHunt}>{game && !newCode ? 'CONTINUE MY HUNT' : 'JOIN THE HUNT'} <ArrowRight size={17} aria-hidden/></button>
       </div></td></tr>
       : ranks.slice(currentRankPage*5,currentRankPage*5+5).map(row => <tr key={row.rank}>
        <td><span className={'hunt-rank-badge' + (row.rank===1 ? ' rank-first' : '')}>{pads(row.rank)}</span></td>
        <td className="hunt-rank-name"><span title={row.name}>{row.name}</span></td>
        <td className="hunt-rank-number">{row.stages} / {row.total}</td>
        <td className="hunt-rank-time">{row.elapsedSeconds!==null ? duration(row.elapsedSeconds) : row.finished ? 'Finished' : 'In play'}</td>
       </tr>)}
      </tbody>
     </table>
     {rankPages>1 && <div className="rank-pagination">
      <button aria-label="Previous rankings page" disabled={currentRankPage===0} onClick={() => setRankPage(currentRankPage-1)}><ChevronLeft size={19} aria-hidden/></button>
      <span aria-live="polite">{currentRankPage+1} / {rankPages}</span>
      <button aria-label="Next rankings page" disabled={currentRankPage===rankPages-1} onClick={() => setRankPage(currentRankPage+1)}><ChevronRight size={19} aria-hidden/></button>
     </div>}
    </div>
    <p className="rank-footnote"><RefreshCw size={15} aria-hidden/> Rankings update every 15 seconds. Fastest full completion wins the tie between finished teams.</p>
   </div>
  </section>}
  {view!=='home'&&helpPhone&&<div className="player-support"><HelpCircle size={17} aria-hidden/><span>Need help or lost your code? <a href={'tel:'+helpPhone.replace(/[^+0-9]/g,'')}>Call {helpPhone}</a></span></div>}
  </main>
  <HuntTabs view={view} joined={!!game && !newCode} navigate={setView}/>
  {view!=='home'&&loading&&<div className="loading-banner">Dealing the cards…</div>}
  {serverError&&<div role="alert" className="global-error">Backend connection needed: {serverError} <button onClick={()=>void refresh()}>Retry</button></div>}
  {notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
  {overlay && <HuntDialog key={overlay} overlay={overlay} count={publicStageCount}
   collected={game?.completed ?? []} active={game?.stage?.position}
   close={() => setOverlay(null)} onJoin={() => { setOverlay(null); joinHunt(); }}/>}
  {scanning&&<QrScanner onScan={onScan} onClose={()=>setScanning(false)}/>}
 </div>;
}
function sessionStorageSafe(key:string){
 if(typeof window==='undefined')return '';
 try{return window.sessionStorage.getItem(key)||'';}catch{return '';}
}
