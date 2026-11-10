
'use client';

import { useEffect, useRef, useState } from 'react';
import {
 ArrowRight, ArrowUpRight, BookOpen, HelpCircle, Layers, LockKeyhole,
 Trophy, UserPlus, X
} from 'lucide-react';
import OrganizerFields from './OrganizerFields';
import { HuntMark, JokerArtwork, CourtArtwork } from './HuntArtwork';

export type HuntView = 'home' | 'leaderboard' | 'register' | 'game';
export type HuntOverlay = 'rules' | 'cards' | 'organizer';
export const suits = ['♠︎', '♥︎', '♦︎', '♣︎', '★︎'];

export function HuntHeader({ onStory, onOrganizer }: { onStory: () => void; onOrganizer: () => void }) {
 return <header className="hunt-header">
  <div className="hunt-header-inner">
   <button className="hunt-brand" onClick={onStory} aria-label="The Joker's Hunt, The story">
    <HuntMark/><span>JOKER&apos;S <b>HUNT</b></span>
   </button>
   <button className="hunt-organizer" onClick={onOrganizer}><LockKeyhole size={15} aria-hidden/><span>Organizer</span></button>
  </div>
 </header>;
}

export function HuntTabs({ view, joined, navigate }: {
 view: HuntView; joined: boolean; navigate: (view: HuntView) => void;
}) {
 const playView = joined && view !== 'register' ? 'game' : 'register';
 const tabs = [
  { view: 'home', label: 'The story', icon: BookOpen },
  { view: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { view: playView, label: playView === 'game' ? 'My hunt' : 'Join the hunt', icon: joined ? Layers : UserPlus }
 ] as const;
 return <nav className="hunt-tabs" aria-label="Main navigation">
  <div className="hunt-tabs-inner">
   {tabs.map(({ view: target, label, icon: Icon }) => <button key={target}
    aria-current={view === target || target === 'register' && view === 'game' ? 'page' : undefined}
    onClick={() => navigate(target)}><Icon size={22} aria-hidden/>{label}</button>)}
  </div>
 </nav>;
}

export function HuntStory({ joined, count, onJoin, onOverlay }: {
 joined: boolean; count: number; onJoin: () => void; onOverlay: (overlay: HuntOverlay) => void;
}) {
 const [flipped, setFlipped] = useState(false);
 return <section className="hunt-story hunt-grid">
  <div className="story-frame">
   <div className="story-heading">


    <h1>THE<br/>{' '}<em>JOKER&apos;S</em><br/>{' '}HUNT<span>.</span></h1>
    <p className="story-tagline"><strong>Can you outsmart the Joker?</strong></p>
   </div>
   <div className="story-deal">
    <div className="story-deck">
     <div className="deck-orbit" aria-hidden/>
     <span className="deck-spark deck-spark-top" aria-hidden>✦</span>
     <span className="deck-spark deck-spark-bottom" aria-hidden>✧</span>
     <div className="deck-side deck-left" aria-hidden><CourtArtwork rank="Q" suit="♠"/></div>
     <div className="deck-side deck-right" aria-hidden><CourtArtwork rank="K" suit="♦"/></div>
     <button className="joker-flip" type="button" aria-label="Flip the Joker card" aria-pressed={flipped}
      onClick={() => setFlipped(!flipped)}>
      <span className="joker-flip-inner">
       <span className="joker-flip-face" aria-hidden={flipped}><JokerArtwork/></span>
       <span className="joker-flip-face joker-flip-back" aria-hidden={!flipped}>
        <span className="back-star" aria-hidden>✦</span><strong>EVERY CARD<br/>HOLDS A CLUE.</strong><small>TAP TO TURN BACK</small>
       </span>
      </span>
     </button>

    </div>
   </div>
   <div className="story-actions">
    <button className="hunt-button hunt-yellow" onClick={onJoin}>{joined ? 'CONTINUE MY HUNT' : 'START THE HUNT'} <ArrowRight size={19} aria-hidden/></button>
    <div>
     <button className="hunt-button hunt-ghost" onClick={() => onOverlay('rules')}><HelpCircle size={17} aria-hidden/> HOW TO PLAY</button>
     <button className="hunt-button hunt-ghost" onClick={() => onOverlay('cards')}><Layers size={17} aria-hidden/> THE {count} CARDS</button>
    </div>
   </div>
  </div>
 </section>;
}

const rules = [
 ['♣︎', 'FORM YOUR CREW', 'Register your team and save your secret rejoin code.'],
 ['♠︎', 'FOLLOW THE CLUE', 'Find the campus checkpoint hidden behind each riddle.'],
 ['♦︎', 'CRACK THE CODE', 'Scan a QR (or use a backup code), then solve the puzzle.'],
 ['♥︎', 'COLLECT & CONQUER', 'Flip every mystery card to discover the final Joker secret.']
];

function PreviewCard({ suit, number, title, status }: { suit: string; number: string; title?: string; status?: string }) {
 const [turned, setTurned] = useState(false);
 return <button type="button" className="preview-card" aria-pressed={turned} aria-label={'Flip card ' + number}
  onClick={() => setTurned(!turned)}>
  <span className="preview-card-inner">
   <span className="preview-face preview-front" aria-hidden={turned}>
    <span>{number}</span><strong>{suit}</strong><span>{number}</span>
   </span>
   <span className="preview-face preview-back" aria-hidden={!turned}>
    {title ? <Trophy size={21} aria-hidden/> : <LockKeyhole size={21} aria-hidden/>}
    <b>{title ? 'COLLECTED' : status ?? 'LOCKED ' + number}</b>
    <small>{title ?? (status ? 'Find your checkpoint' : 'Opens during the hunt')}</small>
   </span>
  </span>
 </button>;
}

export function HuntDialog({ overlay, count, collected, active, close, onJoin }: {
 overlay: HuntOverlay; count: number;
 collected: { position: number; title: string; suit: string }[];
 active?: number; close: () => void; onJoin: () => void;
}) {
 const dialog = useRef<HTMLDialogElement>(null);
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 useEffect(() => {
  const node = dialog.current;
  if (!node) return;
  node.showModal();
  return () => node.close();
 }, []);

 async function signIn(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const email = String(data.get('email')).trim();
  const password = String(data.get('password'));
  if (!email || !password) {
   setError('Enter your organizer login and password.');
   return;
  }
  setBusy(true);
  setError('');
  try {
   const response = await fetch('/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
   });
   if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Could not sign in. Please try again.');
   }
   window.location.assign('/admin');
  } catch (err) {
   setError((err as Error).message);
   setBusy(false);
  }
 }

 return <dialog ref={dialog} className={'hunt-dialog hunt-dialog-' + overlay} aria-labelledby="hunt-dialog-title"
  onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
  <div className="hunt-dialog-content">
   {overlay === 'organizer' && <span className="sheet-handle" aria-hidden/>}
   <button type="button" className="hunt-dialog-close" onClick={close} aria-label="Close dialog"><X size={22} aria-hidden/></button>
   {overlay === 'rules' && <>
    <p className="hunt-label">THE RULES OF THE GAME ✦</p>
    <h2 id="hunt-dialog-title">{count} CARDS.<br/>INFINITE SUSPENSE.</h2>
    <ol className="hunt-rules">
     {rules.map(([suit, title, description], index) => <li key={title} style={{ animationDelay: index * 50 + 'ms' }}>
      <span className="rule-number" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
      <div><h3>{title}</h3><p>{description}</p></div>
      <span className="rule-suit" aria-hidden>{suit}</span>
     </li>)}
    </ol>
    <button className="hunt-button hunt-yellow" onClick={onJoin}>START THE HUNT <ArrowRight size={18} aria-hidden/></button>
   </>}
   {overlay === 'cards' && <>
    <p className="hunt-label">A HAND YOU WON&apos;T FORGET</p>
    <h2 id="hunt-dialog-title">YOUR DESTINY IS IN THE <em>CARDS.</em></h2>
    <p>{count} checkpoints. {count} collectible cards. One Joker who thinks you can&apos;t make it to the end. Tap a card to turn it.</p>
    <div className="hunt-card-previews">
     {Array.from({ length: count }, (_, index) => {
      const card = collected.find(item => item.position === index + 1);
      return <PreviewCard key={index} number={String(index + 1).padStart(2, '0')}
       suit={card?.suit ? card.suit + '\uFE0E' : suits[index % suits.length]}
       title={card?.title} status={active === index + 1 ? 'IN PLAY' : undefined}/>;
     })}
    </div>
    <button className="hunt-button hunt-yellow" onClick={onJoin}>DEAL ME IN <ArrowRight size={18} aria-hidden/></button>
   </>}
   {overlay === 'organizer' && <>
    <HuntMark size={48}/>
    <h2 id="hunt-dialog-title">ORGANIZER LOGIN</h2>
    <p>Your deck. Your control room.</p>
    <form className="hunt-form" onSubmit={signIn}>
     <OrganizerFields/>
     {error && <p className="hunt-error" role="status">{error}</p>}
     <button className="hunt-button hunt-blue" disabled={busy}>{busy ? 'SIGNING IN…' : 'OPEN THE DASHBOARD'} <ArrowUpRight size={17} aria-hidden/></button>
    </form>
   </>}
  </div>
 </dialog>;
}
