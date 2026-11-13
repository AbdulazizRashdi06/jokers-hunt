'use client';

import { useState,useEffect,useCallback,useMemo,useRef } from 'react';
import {
 ArrowRight,ArrowUpRight,Check,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Copy,Eye,Flag,
 HelpCircle,LockKeyhole,LogOut,Minus,Plus,RefreshCw,ScanLine,ShieldCheck,Sparkles,Trophy,X
} from 'lucide-react';
import { captainPhoneSchema } from '@/lib/team-input';
import QrScanner from '@/components/QrScanner';
import { JokerArtwork, CollectionCard, CourtArtwork, LeaderboardArtwork } from '@/components/HuntArtwork';
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
 return <CollectionCard rank={index+1} suit={suit.replace(/\uFE0E/g,'')} complete={complete} active={active}/>;
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
 [name,setName]=useState(''),[leader,setLeader]=useState(''),[captainPhone,setCaptainPhone]=useState(''),[memberName,setMemberName]=useState(''),[size,setSize]=useState(3),
 [accessInput,setAccessInput]=useState(''),[newCode,setNewCode]=useState(''),
 [working,setWorking]=useState(false),[notice,setNotice]=useState(''),
 [victoryFlipped,setVictoryFlipped]=useState(false),
 [huntPanel,setHuntPanel]=useState<'clue'|'checkpoint'>('clue'),
 [scanning,setScanning]=useState(false),[codeInput,setCodeInput]=useState(''),
 [scanned,setScanned]=useState(''),[answer,setAnswer]=useState(''),
[clock,setClock]=useState(Date.now()),
 [overlay,setOverlay]=useState<HuntOverlay|null>(null),[formError,setFormError]=useState(''),
 [copied,setCopied]=useState(false),[rankPage,setRankPage]=useState(0),[rankPageSize,setRankPageSize]=useState(5);
 useEffect(()=>{const resize=()=>setRankPageSize(window.innerHeight<700?3:5);resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const [pagePhase,setPagePhase]=useState<'enter'|'exit'>('enter');
 const [pageDirection,setPageDirection]=useState(1);
 const navigationTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(navigationTimer.current)clearTimeout(navigationTimer.current);},[]);
 function setView(next:HuntView){
  if(navigationTimer.current)clearTimeout(navigationTimer.current);
  if(next===view){setPagePhase('enter');return;}
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   updateView(next);setPagePhase('enter');return;
  }
  const order={home:0,leaderboard:1,register:2,game:2};
  setPageDirection(order[next]>=order[view]?1:-1);
  setPagePhase('exit');
  navigationTimer.current=setTimeout(()=>{
   updateView(next);setPagePhase('enter');navigationTimer.current=null;
  },220);
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
 useEffect(()=>{setAnswer('');setCodeInput('');setHuntPanel('clue');},[game?.stage?.id]);
 useEffect(()=>{if(scanned)setHuntPanel('checkpoint');},[scanned]);
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
  if(registerMode==='new'&&!captainPhoneSchema.safeParse(captainPhone).success){setFormError('Add a valid captain phone number, including country code, so organizers can contact you about prizes.');return;}
  if(registerMode==='rejoin'&&memberName.trim().length<2){setFormError('Enter your name or username (at least two characters).');return;}
  if(registerMode==='rejoin'&&!accessInput.trim()){
   setFormError('Enter your rejoin code.');
   return;
  }
  setWorking(true);
  try{
   const data=await send(registerMode==='new'?'/api/team/register':'/api/team/rejoin',
    registerMode==='new'?{teamName:name,leaderName:leader,captainPhone,size}:
    {teamName:name,accessCode:accessInput,memberName});
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
   setGame(null);setNewCode('');setName('');setLeader('');setCaptainPhone('');setMemberName('');setAccessInput('');
   setSize(3);setRegisterMode('new');setCopied(false);
  }catch(err){setFormError((err as Error).message);}
  finally{setWorking(false);}
 }
 const joinHunt=()=>setView(game&&!newCode?'game':'register');
 const rankPages=Math.max(1,Math.ceil(ranks.length/rankPageSize));
 const currentRankPage=Math.min(rankPage,rankPages-1);
 const elapsed=game?.team.startedAt?duration(
  ((game.paused&&game.pausedAt?new Date(game.pausedAt).getTime():clock)-
  new Date(game.team.startedAt).getTime())/1000
  -game.pausedTotalSeconds+game.team.startedPauseSeconds
 ):'00:00:00';
 const complete=!!game&&!game.notStarted&&!game.stage&&game.total>0;
 const result=ranks.find(row=>row.name===game?.team.name&&row.finished);
 useEffect(()=>{
  if(!complete||view!=='game')return;
  let stopped=false;
  const load=async()=>{try{const r=await fetch('/api/leaderboard',{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(!stopped)setRanks(d.rows||[]);}catch{}};
  void load();const t=setInterval(load,10000);return()=>{stopped=true;clearInterval(t);};
 },[complete,view]);
 const fill=game&&game.total?Math.round((game.completed.length/game.total)*100):0;
 const qrStageMatch=!game?.stage||!sessionStorageSafe('qr-stage')||sessionStorageSafe('qr-stage')===game.stage.id;
 const collection=useMemo(()=>Array.from({length:game?.total||5},(_,i)=>{
  const collected=game?.completed.find(s=>s.position===i+1);
  const active=game?.stage?.position===i+1;
  return {index:i,done:!!collected,active,suit:collected?.suit||(active?game?.stage?.suit:suits[i%suits.length])||'★'};
 }),[game]);
 return <div className="hunt-app">
  <HuntHeader onStory={() => setView('home')} onOrganizer={() => setOverlay('organizer')}/>
  <main key={view} className={'hunt-main hunt-main-' + view + ' page-' + pagePhase} style={{'--page-direction':pageDirection} as React.CSSProperties} aria-busy={pagePhase==='exit'}>
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
      <p>{size} players. Share this code with your teammates. Each person joins with their own name or username.</p>
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
       <button aria-pressed={registerMode==='rejoin'} onClick={() => { setRegisterMode('rejoin'); setFormError(''); }}>Join / rejoin</button>
      </div>
      <form className="hunt-form" noValidate onSubmit={event => { event.preventDefault(); void register(); }}>
       <label>TEAM NAME<input value={name} onChange={event => { setName(event.target.value); setFormError(''); }} placeholder="The Wild Cards" maxLength={45}/></label>
       {registerMode==='new' ? <>
        <label>CAPTAIN&apos;S NAME OR USERNAME<input value={leader} onChange={event => { setLeader(event.target.value); setFormError(''); }} placeholder="Your name" maxLength={70} autoComplete="name"/></label>
        <label>CAPTAIN&apos;S PHONE NUMBER<input type="tel" inputMode="tel" autoComplete="tel" value={captainPhone} onChange={event=>{setCaptainPhone(event.target.value);setFormError('');}} placeholder="Include your country code" maxLength={30}/><small>Organizers only — used for hunt support and prize collection.</small></label>
        <div className="join-player-row">
         <span id="join-player-label">NUMBER OF PLAYERS</span>
         <div className="join-stepper" role="group" aria-labelledby="join-player-label">
          <button type="button" aria-label="Remove one player" disabled={size<=2} onClick={() => setSize(size-1)}><Minus size={18} aria-hidden/></button>
          <output aria-live="polite" aria-label="Players">{size}</output>
          <button type="button" aria-label="Add one player" disabled={size>=10} onClick={() => setSize(size+1)}><Plus size={18} aria-hidden/></button>
         </div>
        </div>
       </> : <><label>YOUR NAME OR USERNAME<input value={memberName} onChange={event=>{setMemberName(event.target.value);setFormError('');}} placeholder="Use the same name each time" maxLength={70} autoComplete="nickname"/></label><label>TEAM CODE<input className="join-rejoin-code" value={accessInput} onChange={event => { setAccessInput(event.target.value.toUpperCase()); setFormError(''); }}
        placeholder="XXXX-XXXX" maxLength={32} autoCapitalize="characters" autoComplete="off" spellCheck={false}/></label></>}
       <button className="hunt-button hunt-blue" disabled={working} type="submit">
        {working ? 'ONE MOMENT…' : registerMode==='new' ? 'CREATE MY TEAM' : 'JOIN / REJOIN TEAM'} <ArrowRight size={18} aria-hidden/>
       </button>
       {formError ? <p className="hunt-error" role="alert">{formError}</p>
        : <p className="join-privacy"><ShieldCheck size={16} aria-hidden/> Names, captain phone numbers and team codes stay off the public leaderboard.</p>}
      </form>
     </>}
    </div>
   </div>
  </section>}
  {view==='game'&&<section className="inner-page game-page">
   <div className="layout-wide">
    {!game?<div className="empty-state"><span>♠</span><h2>YOUR HAND IS EMPTY.</h2><p>You need a team before the cards can be dealt.</p>
      <button className="btn btn-yellow" onClick={()=>setView('register')}>Register or rejoin <ArrowRight/></button></div>
    :complete?<div className="victory-reworked">
      <div className="victory-heading"><p>THE FINAL CARD IS YOURS</p><h1>YOU OUTSMARTED<br/><em>THE JOKER.</em></h1></div>
      <button className="victory-joker" aria-label="Flip your winning Joker card" aria-pressed={victoryFlipped} onClick={()=>setVictoryFlipped(v=>!v)}>
       <span className="victory-joker-inner"><span className="victory-joker-front"><JokerArtwork/></span><span className="victory-joker-back"><b>HUNT<br/>COMPLETE.</b><strong>{game.team.name}</strong><small>THE JOKER CONCEDES.</small></span></span>
      </button>
      <p className="victory-flip-prompt">Tap the Joker to turn your final card.</p>
      <div className="victory-result"><div><span>YOU FINISHED IN</span><strong>{result?.elapsedSeconds!=null?duration(result.elapsedSeconds):'Checking time…'}</strong></div><div><span>CURRENT PLACE</span><strong>{result?'#'+result.rank:'Checking…'}</strong></div></div>
      <p className="victory-team-name">{game.team.name}</p>
      <div className="victory-menu"><button className="btn btn-yellow" onClick={()=>setView('leaderboard')}>Leaderboard</button><button className="btn btn-outline" onClick={()=>window.print()}>Print victory card</button></div>
      <div className="victory-certificate" id="certificate"><span className="certificate-kicker">THE JOKER&apos;S HUNT</span><h2>MASTER OF THE DECK</h2><div className="certificate-team">{game.team.name}</div><p>Collected all {game.total} cards and outsmarted the Joker.</p><p>Time: {result?.elapsedSeconds!=null?duration(result.elapsedSeconds):'Pending'} · Current place: {result?'#'+result.rank:'Pending'}</p></div>
    </div>:<div className="dashboard">
     <div className="dashboard-header">
      <div><span className="eyebrow">WELCOME TO THE GAME,</span>
       <h1>{game.team.name}<span> ✦</span></h1>
       </div>
      <div className="game-timer"><Clock3 size={18}/><div><small>YOUR HUNT TIME</small><strong>{elapsed}</strong></div></div>
     </div>
     {game.paused&&<div className="paused-banner"><LockKeyhole/> Hunt paused by organizers.</div>}
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
        <p>Start when your team is ready. Your timer begins then.</p>
        <button className="btn btn-yellow" disabled={working||game.paused} onClick={()=>void startHunt()}>
         {working?'Preparing the deck…':'Begin the hunt'} <ArrowRight size={19}/></button>
       </div>}
       {game.stage&&<div className={"stage-panel hunt-panel-"+huntPanel}>
        <div className="stage-head"><div className="stage-number">0{game.stage.position}</div>
         <div><span className="eyebrow">YOUR CURRENT MISSION</span><h2>{game.stage.title}</h2></div>
        <div className="stage-suit" aria-hidden>{game.stage.suit+'\uFE0E'}</div></div>
        <div className="mission-tabs" role="group" aria-label="Current mission panel">
         <button aria-pressed={huntPanel==='clue'} onClick={()=>setHuntPanel('clue')}><Eye size={15}/> The clue</button>
         <button aria-pressed={huntPanel==='checkpoint'} onClick={()=>setHuntPanel('checkpoint')}><ScanLine size={15}/>{game.stage.checkpointVerified?'The puzzle':'Checkpoint'}</button>
        </div>
        {huntPanel==='clue'&&<div className="mission-clue"><div className="clue-box"><span><Eye size={17}/> THE JOKER&apos;S CLUE</span><p>“{game.stage.clue}”</p></div>
         <div className="mission-clue-actions"><button className="btn btn-blue" onClick={()=>setHuntPanel('checkpoint')}>{game.stage.checkpointVerified?'Open puzzle':'At the checkpoint?'} <ArrowRight size={16}/></button></div>
        </div>}
        <div className="location-line"><Flag size={19}/><span>{game.stage.locationLabel}</span></div>
        {huntPanel==='checkpoint'&&(!game.stage.checkpointVerified?<div className="checkpoint-area">
         <div className="checkpoint-title"><ScanLine/><div><h3>FIND THE CHECKPOINT.</h3>
          <p>{game.stage.staffOnly?'This stage needs an organizer to verify your arrival.':"Scan the QR or enter its backup code."}</p></div></div>
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
         <p className="help-text"><HelpCircle size={17}/> Missing QR? Ask checkpoint staff.</p>
        </div>:<div className="challenge-panel">
         <div className="challenge-unlocked"><CheckCircle2 size={18}/> CHECKPOINT VERIFIED · PUZZLE UNLOCKED</div>
         <span className="eyebrow">THE JOKER ASKS…</span>
         <h3>{game.stage.question}</h3>
         <form onSubmit={e=>{e.preventDefault();void solve();}} className="answer-row">
          <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Your answer goes here…" aria-label="Your puzzle answer" maxLength={150} required/>
          <button className="btn btn-yellow" disabled={working||game.paused}>Submit answer <ArrowRight size={19}/></button>
         </form>
        </div>)}
       </div>}
      </div>
      <button className="text-link logout-link" onClick={()=>void logout()}><LogOut size={15}/> Switch team / leave device</button>
     </div>
    </div>}
   </div>
  </section>}

  {view==='leaderboard'&&<section className="hunt-rankings">
   <div className="rank-frame">
    <div className="rank-hero">
     <div><p className="hunt-label">THE GAME IS AFOOT</p><h1>THE<br/><em>LEADER<br/>BOARD.</em></h1></div>
     <div className="rank-trophy-scene"><LeaderboardArtwork/></div>
    </div>
    <p className="rank-intro">Who is playing the strongest hand?</p>
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
       : ranks.slice(currentRankPage*rankPageSize,currentRankPage*rankPageSize+rankPageSize).map(row => <tr key={row.rank} className={row.rank<=3?'rank-podium rank-place-'+row.rank:undefined}>
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
    <p className="rank-footnote"><RefreshCw size={15} aria-hidden/> Standings refresh every 15 seconds.</p>
    <div className="rank-deck-decoration" aria-hidden="true">
     <span className="rank-scatter scatter-one">✦</span><span className="rank-scatter scatter-two">✧</span>
     <span className="rank-scatter scatter-three">♦</span><span className="rank-scatter scatter-four">♣</span>
     <div className="rank-mini-card mini-queen"><CourtArtwork rank="Q" suit="♠"/></div>
     <div className="rank-mini-card mini-king"><CourtArtwork rank="K" suit="♦"/></div>
     <div className="rank-mini-card mini-joker"><JokerArtwork decorative/></div>
     <span className="rank-scatter scatter-five">✦</span>
    </div>
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
