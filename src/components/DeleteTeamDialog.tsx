'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Trash2 } from 'lucide-react';

export default function DeleteTeamDialog({team,close,deleted}:{team:{id:string;name:string};close:()=>void;deleted:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 const [token,setToken]=useState(''),[name,setName]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
 async function submit(){
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/admin/teams',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    action:token?'deleteTeam':'prepareDelete',teamId:team.id,confirmation:token,confirmName:name,reason
   })});
   const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not delete team.');
   if(token)deleted();else setToken(data.confirmation);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <dialog ref={ref} className="hunt-dialog delete-team-dialog" aria-labelledby="delete-title" onCancel={e=>{e.preventDefault();if(!busy)close();}}>
  <div className="hunt-dialog-content">
   <button className="hunt-dialog-close" aria-label="Cancel deletion" disabled={busy} onClick={close}><X size={20}/></button>
   <p className="hunt-label">CONFIRMATION {token?'2':'1'} OF 2</p>
   <h2 id="delete-title">Delete {team.name}?</h2>
   <p>This permanently removes this team, its progress and its device sessions. Other teams and the hunt stay in place.</p>
   {token?<form className="hunt-form" onSubmit={e=>{e.preventDefault();void submit();}}>
    <label>TYPE THE EXACT TEAM NAME<input autoFocus value={name} onChange={e=>setName(e.target.value)} required autoComplete="off"/></label>
    <label>REASON<input value={reason} onChange={e=>setReason(e.target.value)} minLength={8} maxLength={400} required placeholder="Why is this team being removed?"/></label>
    <p>This cannot be undone.</p>
    <button className="btn danger-button" disabled={busy||name!==team.name||reason.trim().length<8}><Trash2 size={17}/>{busy?'Deleting…':'Permanently delete team'}</button>
   </form>:<button className="btn danger-button" disabled={busy} onClick={()=>void submit()}>{busy?'Preparing…':'I understand — continue'}</button>}
   <button className="btn btn-outline" disabled={busy} onClick={close}>Keep team</button>
   {error&&<p role="alert" className="hunt-error">{error}</p>}
  </div>
 </dialog>;
}
