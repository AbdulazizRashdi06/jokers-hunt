'use client';
import { useEffect,useId,useState } from 'react';
import { X,Camera } from 'lucide-react';

export default function QrScanner({onScan,onClose}:{
 onScan:(result:string)=>void;onClose:()=>void;
}){
 const id=useId().replace(/:/g,'_');
 const [error,setError]=useState('');
 useEffect(()=>{
  let scanner:import('html5-qrcode').Html5Qrcode|undefined,closed=false;
  (async()=>{
   try{
    const {Html5Qrcode}=await import('html5-qrcode');
    if(closed)return;
    scanner=new Html5Qrcode(id,{verbose:false});
    await scanner.start(
     {facingMode:'environment'},
     {fps:8,qrbox:{width:230,height:230}},
     (text)=>{if(!closed){closed=true;onScan(text);void scanner?.stop().catch(()=>{});}},
     ()=>{}
    );
    if(closed)void scanner.stop().catch(()=>{});
   }catch{
    if(!closed)setError('Could not open your camera. Allow camera permission, use HTTPS, or scan the printed QR with your phone camera.');
   }
  })();
  return ()=>{closed=true;void scanner?.stop().catch(()=>{});};
 },[id,onScan]);
 return <div className="modal-shade" role="dialog" aria-modal="true" aria-label="Scan QR checkpoint">
  <div className="modal-card scanner-modal">
   <button className="icon-btn close-button" onClick={onClose} aria-label="Close scanner"><X size={22}/></button>
   <div className="eyebrow"><Camera size={15}/> CHECKPOINT CAMERA</div>
   <h2>Find the mark.</h2>
   <p>Point your camera at your current stage&apos;s Joker QR code.</p>
   <div id={id} className="scanner-target"/>
   {error&&<p className="error-note">{error}</p>}
   <p className="muted mini">If a code is missing, use its backup code or ask staff to verify the checkpoint.</p>
  </div>
 </div>;
}
