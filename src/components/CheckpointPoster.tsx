import { CourtArtwork } from './HuntArtwork';
export default function CheckpointPoster({stage,qr}:{stage:{position:number;title:string;suit:string;locationLabel:string;backupCode:string};qr:string}){
 return <div className="checkpoint-poster">
  <div className="poster-background" aria-hidden="true"><span className="poster-court poster-court-left"><CourtArtwork rank="Q" suit="♠"/></span><span className="poster-court poster-court-right"><CourtArtwork rank="K" suit="♦"/></span><span className="poster-pip">{stage.suit}</span></div>
  <header><span>THE JOKER&apos;S HUNT</span><b>CHECKPOINT {String(stage.position).padStart(2,'0')}</b><h2>{stage.title}</h2><p>{stage.locationLabel}</p></header>
  <div className="poster-qr"><img src={qr} alt={`Checkpoint ${stage.position} QR code`}/></div>
  <div className="poster-instructions"><b>SCAN. SOLVE. COLLECT.</b><p>Open your team&apos;s hunt and scan this code.</p></div>
  <footer><span>CAN&apos;T SCAN? ENTER THIS BACKUP CODE</span><strong>{stage.backupCode}</strong></footer>
  <span className="poster-edge-pip" aria-hidden="true">{stage.suit}</span>
 </div>;
}
