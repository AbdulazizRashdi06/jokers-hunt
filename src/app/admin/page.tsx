'use client';

import Image from 'next/image';
import { useState,useEffect,useCallback } from 'react';
import {
 ArrowLeft,ArrowRight,ChevronDown,ChevronUp,Copy,Download,Edit3,
 Lock,LogOut,Pause,Play,Plus,Printer,RefreshCw,Save,ShieldCheck,
 Sparkles,Trash2,Users,X,Check,Trophy,RotateCw
} from 'lucide-react';

type Stage={
 id:string;position:number;title:string;suit:'♠'|'♥'|'♦'|'♣'|'★';
 locationLabel:string;clue:string;hint:string;question:string;answer:string;
 qrToken:string;backupCode:string;staffOnly:boolean;enabled:boolean
};
type Team={
 id:string;name:string;leaderName:string;size:number;startedAt:string;finishedAt:string|null;
 completed:number;checkpointVerified:string[]
};
const blank:Omit<Stage,'id'|'qrToken'|'backupCode'>={
 title:'',suit:'♠',position:1,locationLabel:'[Campus Location]',
 clue:'',hint:'',question:'',answer:'',staffOnly:false,enabled:true
};
async function req(url:string,options?:RequestInit){
 const r=await fetch(url,{cache:'no-store',...options});
 const d=await r.json().catch(()=>({error:'Unexpected server response.'}));
 if(!r.ok)throw new Error(d.error||'Request failed.');
 return d;
}
async function post(url:string,payload:unknown,method='POST'){
 return req(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
}
export default function AdminPage(){
 const [authorized,setAuthorized]=useState(false),[loading,setLoading]=useState(true),
 [email,setEmail]=useState(''),[password,setPassword]=useState(''),
 [stages,setStages]=useState<Stage[]>([]),[teams,setTeams]=useState<Team[]>([]),
 [paused,setPaused]=useState(false),[tab,setTab]=useState<'stages'|'teams'|'print'>('stages'),
 [editing,setEditing]=useState<Partial<Stage>|null>(null),[notice,setNotice]=useState(''),
 [busy,setBusy]=useState(false),[selectedTeam,setSelectedTeam]=useState(''),
 [selectedStage,setSelectedStage]=useState(''),[reason,setReason]=useState(''),
 [qrStage,setQrStage]=useState(''),[copies,setCopies]=useState(3),
 [qrData,setQrData]=useState(''),[printing,setPrinting]=useState(false);
 const refresh=useCallback(async()=>{
  try{
   const [ss,ts]=await Promise.all([req('/api/admin/stages'),req('/api/admin/teams')]);
   setStages(ss.stages);setTeams(ts.teams);setPaused(!!ts.paused);
   setAuthorized(true);
  }catch(e){setNotice((e as Error).message);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  req('/api/admin/session').then(()=>void refresh())
  .catch(()=>setLoading(false));
 },[refresh]);
 useEffect(()=>{
  const after=()=>setPrinting(false);window.addEventListener('afterprint',after);
  return()=>window.removeEventListener('afterprint',after);
 },[]);
 useEffect(()=>{
  if(!qrStage){setQrData('');return;}
  const stage=stages.find(s=>s.id===qrStage);
  if(!stage)return;
  const site=(process.env.NEXT_PUBLIC_SITE_URL||window.location.origin).replace(/\/$/,'');
  const url=`${site}/?stage=${stage.id}&checkpoint=${encodeURIComponent(stage.qrToken)}`;
  let ignore=false;
  import('qrcode').then(QRCode=>QRCode.toDataURL(url,{width:600,margin:2,
   color:{dark:'#15202A',light:'#FFFFFF'}})).then(data=>{if(!ignore)setQrData(data);})
  .catch(()=>setNotice('Could not generate this QR.'));return()=>{ignore=true;};
 },[qrStage,stages]);
 async function login(e:React.FormEvent){
  e.preventDefault();setBusy(true);setNotice('');
  try{await post('/api/admin/session',{email,password});setPassword('');await refresh();}
  catch(e){setNotice((e as Error).message);}
  finally{setBusy(false);}
 }
 async function logout(){
  try{await req('/api/admin/session',{method:'DELETE'});setAuthorized(false);}
  catch(e){setNotice((e as Error).message);}
 }
 async function saveStage(){
  if(!editing)return;
  setBusy(true);setNotice('');
  try{
   const isNew=!editing.id;
   const d=await post('/api/admin/stages',{action:isNew?'create':'update',
    id:editing.id,stage:editing});
   setStages(d.stages);setEditing(null);setNotice('Stage saved. The deck has been updated.');
  }catch(e){setNotice((e as Error).message);}
  finally{setBusy(false);}
 }
 async function stageAction(action:'delete'|'rotateQr'|'rotateBackup',id:string){
  if(action==='delete'&&!confirm('Permanently delete this stage? Stages with team progress cannot be deleted.'))return;
  if(action!=='delete'&&!confirm('This will invalidate existing printed copies of that code. Continue?'))return;
  try{
   const d=await post('/api/admin/stages',{action,id});setStages(d.stages);
   setNotice(action==='delete'?'Stage deleted.':'Code rotated. Reprint the checkpoint signs.');
  }catch(e){setNotice((e as Error).message);}
 }
 async function move(id:string,direction:number){
  const ordered=[...stages].sort((a,b)=>a.position-b.position);
  const i=ordered.findIndex(s=>s.id===id),j=i+direction;
  if(i<0||j<0||j>=ordered.length)return;
  [ordered[i],ordered[j]]=[ordered[j],ordered[i]];
  try{const d=await post('/api/admin/stages',{action:'reorder',ids:ordered.map(s=>s.id)});
   setStages(d.stages);}
  catch(e){setNotice((e as Error).message);}
 }
 async function teamAction(action:'staffVerify'|'unblock'|'pause'|'resume'){
  setBusy(true);setNotice('');
  try{
   if(action==='unblock'&&!confirm('Bypass the puzzle for this team? This action is logged and should only be used for recovery.'))return;
   await post('/api/admin/teams',{action,teamId:selectedTeam,stageId:selectedStage,reason});
   await refresh();setNotice(action==='staffVerify'?'Checkpoint verified by staff.':
    action==='unblock'?'Team manually unblocked.':'Game status updated.');
  }catch(e){setNotice((e as Error).message);}
  finally{setBusy(false);}
 }
 const chosen=stages.find(s=>s.id===qrStage);
 if(loading)return <div className="admin-loading">✦ SHUFFLING THE DECK…</div>;
 if(!authorized)return <div className="admin-login-screen">
  <div className="admin-login-art"><a href="/" className="back-home"><ArrowLeft size={17}/> Back to the hunt</a>
   <span className="admin-giant">♠</span><h1>BEHIND THE<br/>CURTAIN<span>.</span></h1>
   <p>Organizer access only. The Joker trusts you with the deck.</p>
   <Image src="/debate-logo.png" alt="Debate Club logo" width={96} height={96}/>
  </div>
  <div className="admin-login-form">
   <div className="admin-form-card"><span className="eyebrow dark-kicker"><Lock size={16}/> ORGANIZER PORTAL</span>
    <h2>WELCOME, DEALER.</h2><p>Sign in with an authorized Supabase organizer account.</p>
    <form onSubmit={login} className="stack-form">
     <label>EMAIL <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="organizer@example.com"/></label>
     <label>PASSWORD <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your secure password"/></label>
     <button className="btn btn-blue full" disabled={busy}>Unlock the deck <ArrowRight size={18}/></button>
    </form>
    {notice&&<p className="error-note">{notice}</p>}
   </div>
  </div>
 </div>;
 return <div className="admin-shell">
  <header className="admin-header"><a href="/" className="admin-brand">✦ JOKER&apos;S HUNT <small>CONTROL ROOM</small></a>
   <div className="admin-nav"><button onClick={()=>void refresh()}><RefreshCw size={17}/> Refresh</button>
    <button onClick={()=>void logout()}><LogOut size={17}/> Log out</button></div></header>
  <div className="admin-wrap">
   <div className="admin-top"><div><span className="eyebrow dark-kicker">GUVOICES × GERMAN FESTIVAL</span>
    <h1>THE DEALER&apos;S DESK<span> ★</span></h1>
    <p>Build the hunt. Protect the players. Keep the Joker on his toes.</p></div>
    <button className={`status-button ${paused?'paused':''}`} onClick={()=>void teamAction(paused?'resume':'pause')}>
     {paused?<Play size={18}/>:<Pause size={18}/>} {paused?'RESUME GAME':'PAUSE GAME'}</button></div>
   <div className="admin-metrics">
    <div><span>ACTIVE STAGES</span><b>{stages.filter(s=>s.enabled).length}</b><small>in the deck</small></div>
    <div><span>REGISTERED TEAMS</span><b>{teams.length}</b><small>ready to play</small></div>
    <div><span>FINISHED TEAMS</span><b>{teams.filter(t=>t.finishedAt).length}</b><small>Joker defeated</small></div>
    <div><span>GAME STATUS</span><b className="status-text">{paused?'PAUSED':'LIVE'}</b><small>organizer controlled</small></div>
   </div>
   <div className="admin-tabs">
    <button className={tab==='stages'?'selected':''} onClick={()=>setTab('stages')}><Edit3 size={17}/> Stage editor</button>
    <button className={tab==='teams'?'selected':''} onClick={()=>setTab('teams')}><Users size={17}/> Teams & recovery</button>
    <button className={tab==='print'?'selected':''} onClick={()=>setTab('print')}><Printer size={17}/> Print checkpoints</button>
   </div>
   {notice&&<div className="admin-notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={16}/></button></div>}
   {tab==='stages'&&<div className="admin-body">
    <div className="admin-section-heading"><div><h2>YOUR MYSTERY DECK</h2><p>Change clues, answers, order and stage count whenever necessary.</p></div>
     <button className="btn btn-blue" onClick={()=>setEditing({...blank,position:stages.length+1})}><Plus size={17}/> New stage</button></div>
    {stages.slice().sort((a,b)=>a.position-b.position).map((s,i)=><div className="stage-admin-row" key={s.id}>
     <div className="stage-admin-suit">{s.suit}</div>
     <div className="stage-admin-info"><b>{String(s.position).padStart(2,'0')} / {s.title}</b><span>{s.locationLabel}</span>
      <small>{s.staffOnly?'STAFF VERIFIED':'QR + BACKUP'} · {s.enabled?'ENABLED':'DISABLED'}</small></div>
     <div className="admin-row-controls">
      <button title="Move earlier" disabled={i===0} onClick={()=>void move(s.id,-1)}><ChevronUp size={18}/></button>
      <button title="Move later" disabled={i===stages.length-1} onClick={()=>void move(s.id,1)}><ChevronDown size={18}/></button>
      <button title="Edit" onClick={()=>setEditing({...s})}><Edit3 size={18}/></button>
      <button title="Delete" onClick={()=>void stageAction('delete',s.id)}><Trash2 size={18}/></button>
     </div>
    </div>)}
    {stages.length===0&&<p>No stages exist yet. Add one or run the sample seed script.</p>}
    <p className="admin-warning">Changing stage order or disabling stages during a live hunt can change active teams&apos; progression. Review changes with staff first.</p>
   </div>}
   {tab==='teams'&&<div className="admin-body">
    <div className="admin-section-heading"><div><h2>TEAM COMMAND CENTER</h2><p>Leader details are private to organizers. Staff interventions are audited.</p></div>
     <a className="btn btn-blue" href="/api/admin/export"><Download size={18}/> Export leaderboard CSV</a></div>
    <div className="team-grid">
     {teams.map(t=><div className={`team-admin-card ${selectedTeam===t.id?'selected':''}`} key={t.id}
      onClick={()=>{setSelectedTeam(t.id);setSelectedStage('');}}>
      <div><b>{t.name}</b><span>{t.finishedAt?'FINISHED':`${t.completed} cards`}</span></div>
      <small>Leader: {t.leaderName} · {t.size} players</small>
     </div>)}
     {teams.length===0&&<p>No teams registered yet.</p>}
    </div>
    <div className="staff-panel">
     <span className="eyebrow dark-kicker"><ShieldCheck size={17}/> EMERGENCY RECOVERY / STAFF ASSISTANCE</span>
     <h3>CHECKPOINT VERIFICATION</h3>
     <p>Use when a QR is lost, damaged, or deliberately requires staff verification. Only the current stage can be verified. Puzzle solving remains mandatory unless you explicitly perform a manual unblock.</p>
     <div className="staff-form">
      <label>TEAM <select value={selectedTeam} onChange={e=>{setSelectedTeam(e.target.value);setSelectedStage('');}}>
       <option value="">Choose team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select></label>
      <label>STAGE <select value={selectedStage} onChange={e=>setSelectedStage(e.target.value)}>
       <option value="">Choose their current stage</option>{stages.filter(s=>s.enabled).map(s=><option key={s.id} value={s.id}>{s.position}: {s.title}</option>)}
      </select></label>
      <label className="wide-field">REASON FOR INTERVENTION <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Printed checkpoint was missing"/></label>
     </div>
     <div className="staff-actions">
      <button disabled={!selectedTeam||!selectedStage||reason.trim().length<8||busy} className="btn btn-blue" onClick={()=>void teamAction('staffVerify')}><Check size={18}/> Verify checkpoint only</button>
      <button disabled={!selectedTeam||!selectedStage||reason.trim().length<8||busy} className="btn btn-outline" onClick={()=>void teamAction('unblock')}><ShieldCheck size={18}/> Manual unblock (bypass puzzle)</button>
     </div>
     <small>Warning: manual unblock overrides the normal challenge and leaves an audit record. Use sparingly for fairness.</small>
    </div>
   </div>}
   {tab==='print'&&<div className="admin-body">
    <div className="admin-section-heading"><div><h2>CHECKPOINT PRINT STUDIO</h2><p>Print multiple identical copies. Place them in different spots at the same checkpoint.</p></div></div>
    <div className="print-controls">
     <label>STAGE <select value={qrStage} onChange={e=>setQrStage(e.target.value)}>
      <option value="">Select checkpoint</option>{stages.filter(s=>s.enabled).map(s=><option key={s.id} value={s.id}>{s.position}: {s.title}</option>)}
     </select></label>
     <label>NUMBER OF COPIES <select value={copies} onChange={e=>setCopies(Number(e.target.value))}>
      {[1,2,3,4,5,6,8,10].map(n=><option key={n}>{n}</option>)}</select></label>
    </div>
    {chosen&&<div className="print-studio">
     <div className="print-settings"><div><h3>{chosen.title}</h3><p>{chosen.locationLabel}</p>
      <p>Backup code: <strong className="backup-code">{chosen.backupCode}</strong></p>
      <button className="plain-action" onClick={()=>void navigator.clipboard?.writeText(chosen.backupCode)}><Copy size={15}/> Copy backup code</button></div>
      <div className="rotation-actions">
       <button className="btn btn-outline" onClick={()=>void stageAction('rotateQr',chosen.id)}><RotateCw size={16}/> Rotate QR</button>
       <button className="btn btn-outline" onClick={()=>void stageAction('rotateBackup',chosen.id)}><RotateCw size={16}/> Rotate backup</button>
      </div></div>
     <p className="admin-warning">Rotating a code invalidates ALL older printed copies of that code. Reprint after any rotation.</p>
     <div className="qr-preview">{qrData?<img src={qrData} alt="Printable checkpoint QR"/>:<p>Generating QR…</p>}
      <div><span>CHECKPOINT {String(chosen.position).padStart(2,'0')}</span><b>{chosen.title}</b>
       <p>SCAN · SOLVE · COLLECT</p><strong>BACKUP: {chosen.backupCode}</strong></div></div>
     <button className="btn btn-blue" disabled={!qrData} onClick={()=>{
      setPrinting(true);setTimeout(()=>window.print(),250);
     }}><Printer size={19}/> Print {copies} identical {copies===1?'copy':'copies'}</button>
    </div>}
   </div>}
  </div>
  {editing&&<div className="modal-shade admin-modal-layer" role="dialog" aria-modal="true" aria-label="Edit stage">
   <div className="modal-card admin-edit-modal">
    <div className="edit-modal-header"><div><span className="eyebrow dark-kicker">BEHIND THE CARDS</span>
     <h2>{editing.id?'EDIT MYSTERY STAGE':'CREATE A MYSTERY STAGE'}</h2></div>
     <button className="icon-btn" onClick={()=>setEditing(null)} aria-label="Close"><X size={22}/></button></div>
    <form onSubmit={e=>{e.preventDefault();void saveStage();}} className="edit-form">
     <div className="edit-grid">
      <label>TITLE <input required value={editing.title||''} onChange={e=>setEditing({...editing,title:e.target.value})}/></label>
      <label>PLAYING-CARD SUIT <select value={editing.suit} onChange={e=>setEditing({...editing,suit:e.target.value as Stage['suit']})}>
       {['♠','♥','♦','♣','★'].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
      <label>ORDER <input type="number" min="1" max="500" value={editing.position} onChange={e=>setEditing({...editing,position:Number(e.target.value)})}/></label>
      <label>PHYSICAL LOCATION <input required value={editing.locationLabel||''} onChange={e=>setEditing({...editing,locationLabel:e.target.value})}/></label>
     </div>
     <label>PLAYER&apos;S CLUE <textarea required rows={3} value={editing.clue||''} onChange={e=>setEditing({...editing,clue:e.target.value})}/></label>
     <label>HINT <textarea required rows={2} value={editing.hint||''} onChange={e=>setEditing({...editing,hint:e.target.value})}/></label>
     <label>PUZZLE / CHALLENGE <textarea required rows={3} value={editing.question||''} onChange={e=>setEditing({...editing,question:e.target.value})}/></label>
     <label>CORRECT ANSWER <input required={!editing.id} value={editing.answer||''} onChange={e=>setEditing({...editing,answer:e.target.value})}/>
      <small>Stored securely on the server; not sent to players. Answers ignore casing and extra spaces.</small></label>
     <div className="admin-checks">
      <label><input type="checkbox" checked={editing.enabled??true} onChange={e=>setEditing({...editing,enabled:e.target.checked})}/> Stage enabled</label>
      <label><input type="checkbox" checked={editing.staffOnly??false} onChange={e=>setEditing({...editing,staffOnly:e.target.checked})}/> Staff verification required</label>
     </div>
     <button className="btn btn-blue full" disabled={busy}><Save size={18}/> {busy?'Saving…':'Save stage'}</button>
    </form>
   </div>
  </div>}
  {printing&&chosen&&qrData&&<div className="print-only-sheet">
   {Array.from({length:copies},(_,i)=><div className="printed-checkpoint" key={i}>
    <div className="print-brand">✦ THE JOKER&apos;S HUNT</div>
    <h2>CHECKPOINT {String(chosen.position).padStart(2,'0')}</h2>
    <h3>{chosen.title}</h3>
    <img src={qrData} alt={`Stage ${chosen.position} QR code`}/>
    <p>SCAN THE CODE · SOLVE THE PUZZLE · COLLECT YOUR CARD</p>
    <div className="printed-backup">CAN&apos;T SCAN? BACKUP CODE: <b>{chosen.backupCode}</b></div>
    <small>GUvoices × German Festival · Debate Club · 08 DEC 2026</small>
   </div>)}
   <button className="print-hide-close" onClick={()=>setPrinting(false)}>Close print sheet</button>
  </div>}
 </div>;
}
