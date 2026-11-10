'use client';

import Image from 'next/image';
import { useState,useEffect,useCallback,useMemo } from 'react';
import {
 ArrowRight,ArrowLeft,ArrowUpRight,Check,CheckCircle2,Clock3,Copy,
 Crown,Eye,Flag,Heart,HelpCircle,LockKeyhole,Menu,RefreshCw,ScanLine,
 ShieldCheck,Sparkles,Star,Trophy,Users,Volume2,X,Play,LogOut,KeyRound
} from 'lucide-react';
import QrScanner from '@/components/QrScanner';

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
const suits=['♠','♥','♦','♣','★'];
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
function SymbolSpark({style}:{style?:React.CSSProperties}) {
 return <span className="hero-spark" style={style} aria-hidden>✦</span>;
}
function LogoStrip(){return <div className="logo-strip">
 <div className="logo-pair"><Image src="/debate-logo.png" alt="Debate Club logo" width={48} height={48}/>
 <Image src="/german-logo.png" alt="German Club logo" width={48} height={48}/></div>
 <span>GUvoices <b>×</b> German Festival</span>
 </div>}
function Card({suit='★',index=0,complete=false,active=false,small=false}:{
 suit?:string;index?:number;complete?:boolean;active?:boolean;small?:boolean
}){
 return <div className={`collectible ${complete?'collected':''} ${active?'active':''} ${small?'small-card':''}`}>
  <div className="collectible-inner">
   <div className="card-face card-back"><span className="corner-small">J</span>
    <span className="back-emblem">✦<br/><span>JOKER</span></span><span className="corner-small bottom">J</span>
   </div>
   <div className="card-face card-front"><span className="card-rank">{index+1}<small>{suit}</small></span>
    <span className="card-suit">{suit}</span>
    <span className="card-rank lower">{index+1}<small>{suit}</small></span></div>
  </div>
 </div>;
}
function Confetti(){return <div className="confetti-field" aria-hidden>
 {Array.from({length:48},(_,i)=><i key={i} style={{
  '--x':`${(i*37)%100}%`,'--delay':`${(i*13)%18/10}s`,
  '--fall':`${3+(i%5)*0.4}s`,'--rotate':`${i*61}deg`
 } as React.CSSProperties}/>)}
 </div>}
function Navbar({view,setView,hasTeam}:{view:string;setView:(v:string)=>void;hasTeam:boolean}){
 const [mobile,setMobile]=useState(false);
 const nav=(name:string,label:string)=><button className={view===name?'active':''}
 onClick={()=>{setView(name);setMobile(false);}}>{label}</button>;
 return <header className="site-nav">
  <div className="nav-inner">
   <button className="brand" onClick={()=>setView('home')} aria-label="The Joker's Hunt home">
    <span className="brand-symbol">✦</span><span>JOKER&apos;S <b>HUNT</b></span>
   </button>
   <div className={`nav-links ${mobile?'open':''}`}>
    {nav('home','The story')}{nav('leaderboard','Leaderboard')}
    {hasTeam&&nav('game','My cards')}
    <a href="/admin" className="nav-admin">Organizer login <ArrowUpRight size={14}/></a>
   </div>
   <div className="nav-actions">
    {hasTeam?<button className="nav-cta" onClick={()=>setView('game')}>Return to hunt <ArrowRight size={16}/></button>
    :<button className="nav-cta" onClick={()=>setView('register')}>Join the hunt <ArrowRight size={16}/></button>}
    <button className="mobile-menu" onClick={()=>setMobile(!mobile)} aria-label="Menu">{mobile?<X/>:<Menu/>}</button>
   </div>
  </div>
 </header>;
}
export default function Home(){
 const [view,setView]=useState('home'),[game,setGame]=useState<Game|null>(null),
 [loading,setLoading]=useState(true),[serverError,setServerError]=useState(''),
 [publicStageCount,setPublicStageCount]=useState(5),
 [ranks,setRanks]=useState<Rank[]>([]),[registerMode,setRegisterMode]=useState<'new'|'rejoin'>('new'),
 [name,setName]=useState(''),[leader,setLeader]=useState(''),[size,setSize]=useState('3'),
 [accessInput,setAccessInput]=useState(''),[newCode,setNewCode]=useState(''),
 [working,setWorking]=useState(false),[notice,setNotice]=useState(''),
 [scanning,setScanning]=useState(false),[codeInput,setCodeInput]=useState(''),
 [scanned,setScanned]=useState(''),[answer,setAnswer]=useState(''),
 [hint,setHint]=useState(''),[clock,setClock]=useState(Date.now());
 const refresh=useCallback(async()=>{
  const res=await fetch('/api/state',{cache:'no-store'});
  if(res.status===401){setGame(null);setLoading(false);return;}
  const data=await res.json().catch(()=>({error:'Could not read the server response.'}));
  if(!res.ok){setServerError(data.error||'Backend unavailable.');setLoading(false);return;}
  setGame(data);setServerError('');setLoading(false);
 },[]);
 useEffect(()=>{void refresh();
  fetch('/api/config').then(r=>r.json()).then(d=>{
   if(typeof d.totalStages==='number'&&d.totalStages>0)setPublicStageCount(d.totalStages);
  }).catch(()=>{});
 },[refresh]);
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t);},[]);
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
  setNotice('');setWorking(true);
  try{
   const data=await send(registerMode==='new'?'/api/team/register':'/api/team/rejoin',
    registerMode==='new'?{teamName:name,leaderName:leader,size:Number(size)}:
    {teamName:name,accessCode:accessInput});
   await refresh();
   if(data.accessCode)setNewCode(data.accessCode);
   else {setView('game');setNotice('Your team is back in the game!');}
  }catch(e){setNotice((e as Error).message);}
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
  try{await send('/api/team/logout',{});setGame(null);setNewCode('');setView('home');}
  catch(e){setNotice((e as Error).message);}
 }
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
 return <div className="site">
  <Navbar view={view} setView={setView} hasTeam={!!game}/>
  <main>
  {view==='home'&&<>
   <section className="hero">
    <div className="grid-overlay" aria-hidden/>
    <div className="hero-content layout-wide">
     <div className="hero-copy">
      <span className="eyebrow hero-kicker"><Sparkles size={16}/> GUVOICES × GERMAN FESTIVAL · 08 DEC 2026</span>
      <span className="hero-mini">AN ADVENTURE FROM THE DEBATE CLUB</span>
      <h1>THE<br/><em>JOKER&apos;S</em><br/>HUNT<span className="period">.</span></h1>
      <p className="hero-tagline">Every card holds a clue.<br/><b>Can you outsmart the Joker?</b></p>
      <div className="hero-buttons">
       <button className="btn btn-yellow" onClick={()=>setView(game?'game':'register')}>
        {game?'Continue my hunt':'Start the hunt'} <ArrowUpRight size={21}/>
       </button>
       <button className="btn btn-ghost" onClick={()=>document.getElementById('how')?.scrollIntoView({behavior:'smooth'})}>
        How to play <ArrowRight size={20}/>
       </button>
      </div>
      <div className="event-meta"><span>✦ GUtech · Oman</span><span>♣ {publicStageCount} mystery cards</span><span>♥ 1 final reveal</span></div>
     </div>
     <div className="hero-visual" aria-label="The Joker is your mysterious guide">
      <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
      <SymbolSpark style={{top:'5%',right:'16%',fontSize:'72px',color:'#ffd52d'}}/>
      <SymbolSpark style={{bottom:'15%',left:'3%',fontSize:'50px',color:'#fff9eb'}}/>
      <div className="floating-suit suit-one">♠</div>
      <div className="floating-suit suit-two">♥</div>
      <div className="poster-card back-left"><span>J</span><b>♣</b></div>
      <div className="poster-card back-right"><span>K</span><b>♦</b></div>
      <div className="joker-main-card">
       <div className="joker-corners"><b>J</b><span>✦</span></div>
       <div className="joker-illustration"><Image src="/card-fan.webp" alt="Joker playing cards from the event poster" fill
        sizes="(max-width: 700px) 240px, 340px" className="cardfan-image" priority/></div>
       <div className="joker-signature">THE JOKER <span>☻</span></div>
       <span className="joker-bottom">J ✦</span>
      </div>
      <div className="floating-note"><span>★</span> THE GAME IS ON</div>
     </div>
    </div>
    <div className="hero-footer"><LogoStrip/><span>SCROLL TO EXPLORE ↓</span></div>
   </section>
   <div className="marquee" aria-hidden><div>♠ EVERY CARD HOLDS A CLUE ♥ EVERY CARD HOLDS A CLUE ♦ EVERY CARD HOLDS A CLUE ♣ EVERY CARD HOLDS A CLUE ★&nbsp;</div></div>
   <section className="how-section" id="how">
    <div className="layout-wide">
     <div className="section-heading">
      <span className="eyebrow dark-kicker">THE RULES OF THE GAME ✦</span>
      <h2>{publicStageCount} CARDS.<br/><span>INFINITE SUSPENSE.</span></h2>
      <p>Gather your team. Follow the Joker&apos;s trail across campus. Solve the mysteries, collect every card, and unlock the final reveal.</p>
     </div>
     <div className="how-grid">
      {[
       ['01','♣','FORM YOUR CREW','Register your team and save your secret rejoin code.'],
       ['02','♠','FOLLOW THE CLUE','Find the campus checkpoint hidden behind each riddle.'],
       ['03','♦','CRACK THE CODE','Scan a QR (or use a backup code), then solve the puzzle.'],
       ['04','♥','COLLECT & CONQUER','Flip every mystery card to discover the final Joker secret.']
      ].map(([num,symbol,title,desc])=><div className="how-card" key={num}>
       <div className="how-top"><span>{num}</span><b>{symbol}</b></div>
       <h3>{title}</h3><p>{desc}</p>
      </div>)}
     </div>
    </div>
   </section>
   <section className="festival-feature">
    <div className="festival-feature-inner layout-wide">
     <div className="official-poster"><Image src="/poster.webp" alt="Official GUvoices × German Festival event poster"
      width={340} height={481} sizes="(max-width: 700px) 270px, 340px"/></div>
     <div className="festival-feature-copy">
      <span className="eyebrow dark-kicker">THE EVENT BEHIND THE MYSTERY</span>
      <h2>ONE FESTIVAL.<br/><span>COUNTLESS STORIES.</span></h2>
      <p>The Joker&apos;s Hunt is part of GUvoices × German Festival at GUtech, hosted by the Debate Club. The festival&apos;s poster, colors and playing-card spirit shape every mystery in the game.</p>
      <div className="festival-feature-logos"><Image src="/debate-logo.png" alt="Debate Club" width={67} height={67}/><span>×</span>
       <Image src="/german-logo.png" alt="German Club" width={67} height={67}/></div>
      <div className="festival-date">08 DECEMBER 2026 <span>✦</span> GUtech, OMAN</div>
     </div>
    </div>
   </section>
   <section className="teaser-section">
    <div className="teaser-content layout-wide">
     <div><span className="eyebrow">A HAND YOU WON&apos;T FORGET</span>
      <h2>YOUR DESTINY<br/>IS IN THE <i>CARDS.</i></h2>
      <p>{publicStageCount} checkpoints. {publicStageCount} collectible cards. One Joker who thinks you can&apos;t make it to the end.</p>
      <button className="btn btn-blue" onClick={()=>setView(game?'game':'register')}>Deal me in <ArrowUpRight size={19}/></button>
     </div>
     <div className="teaser-hand">{suits.map((s,i)=><div className="teaser-card" key={i} style={{'--r':`${(i-2)*12}deg`,'--offset':`${Math.abs(i-2)*16}px`} as React.CSSProperties}>{s}<small>0{i+1}</small></div>)}</div>
    </div>
   </section>
   <section className="closing-cta"><span>★</span><h2>THE JOKER IS WAITING.</h2><p>December 8, 2026 · GUtech, Oman</p>
    <button className="btn btn-yellow" onClick={()=>setView(game?'game':'register')}>Accept the challenge <ArrowRight size={21}/></button>
   </section>
  </>}
  {view==='register'&&<section className="inner-page register-page">
   <div className="layout-wide registration-layout">
    <div className="registration-story">
     <span className="eyebrow">♠ PLAY YOUR HAND</span>
     <h1>EVERY GREAT<br/>HUNT STARTS<br/><em>WITH A TEAM.</em></h1>
     <p>Make an unforgettable memory. Bring your cleverest friends and keep your access code somewhere safe.</p>
     <div className="story-quote"><span>“</span> A clever crew is better than a lucky card. <b>— The Joker</b></div>
     <Image src="/debate-logo.png" width={80} height={80} alt="Debate Club" className="reg-logo"/>
    </div>
    <div className="form-panel">
     <div className="form-head"><span>J ♥</span><b>THE JOKER&apos;S HUNT</b></div>
     {newCode?<div className="code-success">
      <CheckCircle2 size={44}/><h2>You&apos;re in, {name}!</h2>
      <p>This is your <b>private rejoin code</b>. Save it before starting. Anyone with your team name and code can access your game.</p>
      <div className="secret-code">{newCode}</div>
      <button className="btn btn-outline full" onClick={()=>{void navigator.clipboard?.writeText(newCode);setNotice('Code copied!');}}><Copy size={18}/> Copy access code</button>
      <button className="btn btn-blue full" onClick={()=>{setNewCode('');setView('game');setNotice('Let the hunt begin!');}}>I&apos;ve saved it — start playing <ArrowRight size={18}/></button>
     </div>:<>
      <h2>{registerMode==='new'?'ASSEMBLE YOUR CREW.':'WELCOME BACK.'}</h2>
      <p className="muted">Ready to play your cards right?</p>
      <div className="tab-buttons">
       <button className={registerMode==='new'?'selected':''} onClick={()=>{setRegisterMode('new');setNotice('');}}>New team</button>
       <button className={registerMode==='rejoin'?'selected':''} onClick={()=>{setRegisterMode('rejoin');setNotice('');}}>Rejoin a team</button>
      </div>
      <form onSubmit={e=>{e.preventDefault();void register();}} className="stack-form">
       <label>TEAM NAME <input value={name} onChange={e=>setName(e.target.value)} placeholder="The Wild Cards" maxLength={45} required minLength={2}/></label>
       {registerMode==='new'?<>
        <label>TEAM LEADER&apos;S NAME <input value={leader} onChange={e=>setLeader(e.target.value)} placeholder="Your name" maxLength={70} required minLength={2}/></label>
        <label>NUMBER OF PLAYERS <select value={size} onChange={e=>setSize(e.target.value)}>
         {Array.from({length:9},(_,i)=><option key={i} value={i+2}>{i+2} players</option>)}
        </select></label>
       </>:<label>PRIVATE TEAM ACCESS CODE <input value={accessInput} onChange={e=>setAccessInput(e.target.value)} placeholder="JH-XXXX-XXXX-XXXX" required autoComplete="off"/></label>}
       <button disabled={working} className="btn btn-blue full" type="submit">{working?'One moment…':registerMode==='new'?'Create my team':'Rejoin the hunt'} <ArrowRight size={19}/></button>
      </form>
      <p className="form-note"><ShieldCheck size={16}/> Your leader&apos;s name and team access code are never shown on the leaderboard.</p>
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
         <Image src="/card-fan.webp" alt="Joker playing card art from the official event poster" fill sizes="220px"/>
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
         <span>{c.done?'COLLECTED':c.active?'IN PLAY':'LOCKED'}</span>
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
         <div className="stage-suit">{game.stage.suit}</div></div>
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
  {view==='leaderboard'&&<section className="inner-page rankings-page">
   <div className="layout-wide">
    <div className="rankings-head"><div><span className="eyebrow">THE GAME IS AFOOT</span>
     <h1>THE <em>LEADERBOARD.</em></h1><p>Who is playing the strongest hand? Team names only; private details stay private.</p></div>
     <div className="trophy-illustration"><Trophy size={72}/><span>✦</span></div></div>
    <div className="ranking-table"><div className="ranking-header">
     <span>RANK</span><span>TEAM</span><span>CARDS</span><span>FINISH TIME</span></div>
     {ranks.length===0?<div className="rank-empty"><Trophy size={36}/><h3>THE DECK IS STILL SHUFFLING.</h3><p>No teams to rank yet. Be the first to make your mark!</p></div>
     :ranks.map(row=><div className={`ranking-row ${row.rank<=3?'top-three':''}`} key={row.rank}>
      <div className="rank-badge">{row.rank===1?'🥇':row.rank===2?'🥈':row.rank===3?'🥉':`#${row.rank}`}</div>
      <div className="ranking-team">{row.name}{row.finished&&<span className="won-label">FINISHED</span>}</div>
      <div className="ranking-cards"><span>{'♠'.repeat(Math.min(row.stages,5))}</span><b>{row.stages}/{row.total}</b></div>
      <div className="ranking-time">{row.elapsedSeconds!==null?duration(row.elapsedSeconds):'—'}</div>
     </div>)}
    </div>
    <p className="leaderboard-footnote"><RefreshCw size={15}/> Rankings update every 15 seconds. Fastest full completion wins the tie between finished teams.</p>
   </div>
  </section>}
  </main>
  <footer className="site-footer"><div className="layout-wide footer-inner"><LogoStrip/>
   <span>© 2026 GUvoices × German Festival · Organized by the Debate Club</span>
   <span>♠ ♥ ♦ ♣ ★</span></div></footer>
  {view!=='home'&&loading&&<div className="loading-banner">Dealing the cards…</div>}
  {serverError&&<div role="alert" className="global-error">Backend connection needed: {serverError} <button onClick={()=>void refresh()}>Retry</button></div>}
  {notice&&<div className="toast" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
  {scanning&&<QrScanner onScan={onScan} onClose={()=>setScanning(false)}/>}
 </div>;
}
function sessionStorageSafe(key:string){
 if(typeof window==='undefined')return '';
 try{return window.sessionStorage.getItem(key)||'';}catch{return '';}
}
