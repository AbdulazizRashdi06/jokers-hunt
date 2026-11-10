
import Image from 'next/image';
import { useId } from 'react';

export function HuntMark({ size = 42 }: { size?: number }) {
 return <Image className="hunt-mark" src="/debate-logo.png" alt="" width={size} height={size}/>;
}

export function JokerArtwork({ decorative = false }: { decorative?: boolean }) {
 const figure = useId();
 return <svg className="joker-artwork" viewBox="0 0 150 218" role={decorative ? undefined : 'img'}
  aria-hidden={decorative || undefined} aria-label={decorative ? undefined : 'A mirrored court-card Joker with a belled hat and a sceptre'}>
  <defs>
   <g id={figure} stroke="#131d2a" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round">
    <path d="M32 111 37 88 53 77 91 76 112 89 121 111Z" fill="#146fa9"/>
    <path d="M63 89 84 82 103 111H76Z" fill="#cf5a83"/>
    <path d="M36 104 49 93 51 111H35ZM110 94l10 17h-18Z" fill="#ffd52f"/>
    <path d="m64 99 9-9 9 9-9 10Z" fill="#fff7e4"/>
    <path d="M73 94c-1 2-4 3-4 5 0 2 3 2 4 0l-1 3h2l-1-3c2 2 4 2 4 0 0-2-3-3-4-5Z" fill="#131d2a" stroke="none"/>
    <path d="M49 73q20 12 46-1l5 8-10-1-3 9-8-5-7 9-6-8-9 4-1-8-11-1Z" fill="#ffd52f"/>
    <path d="M57 51q15-10 31 0l-1 13-8 12-12 1-9-9Z" fill="#fff7e4"/>
    <path d="M68 62h1m10-2h1m-7 9q4 2 7-2m-5-5 1 3-2 1" fill="none"/>
    <path d="M55 60C47 56 45 45 49 35c-9-5-16-1-19 6 1-17 13-27 28-18l10 9C66 17 73 9 80 8c-2 9 0 14 5 24 11-12 25-10 30 1-8-3-14 4-19 19Z" fill="#146fa9"/>
    <path d="M68 32C66 17 73 9 80 8c-2 9 0 14 5 24l-9 8Zm17 0c11-12 25-10 30 1-8-3-14 4-19 19l-13-4Z" fill="#cf5a83"/>
    <path d="m49 47 46-8 2 12-44 9Z" fill="#ffd52f"/>
    <path d="m55 50 4-5 5 4-4 6Zm13-2 4-5 5 4-4 5Zm13-3 4-5 5 4-4 6Z" fill="#b9446f" stroke="none"/>
    <path d="M105 105 121 62" fill="none" strokeWidth="4"/>
    <path d="M116 60q-6-7 0-13l4 5 5-8 3 9 6-2q-1 10-10 13Z" fill="#cf5a83"/>
    <path d="M120 57q5 2 9-1" fill="none"/>
    <circle cx="30" cy="42" r="3.6" fill="#ffd52f"/><circle cx="80" cy="8" r="3.6" fill="#ffd52f"/>
    <circle cx="115" cy="34" r="3.6" fill="#ffd52f"/>
   </g>
  </defs>
  <rect x="2" y="2" width="146" height="214" rx="5" fill="#fffaf0" stroke="#131d2a" strokeWidth="3"/>
  <rect x="10" y="10" width="130" height="198" rx="1" fill="none" stroke="#b9446f" strokeWidth=".85"/>
  <path d="m75 15 50 94-50 94-50-94Z" fill="#146fa9" opacity=".09"/>
  <use href={'#' + figure}/>
  <use href={'#' + figure} transform="rotate(180 75 109)"/>
  <path d="M31 109h88" stroke="#131d2a" strokeWidth="1.6"/>
  <g fill="#131d2a" fontFamily="Georgia, serif" fontSize="10" fontWeight="900" letterSpacing="2.4">
   <text transform="translate(20 16) rotate(90)">JOKER</text>
   <text transform="translate(130 202) rotate(-90)">JOKER</text>
  </g>
  <path d="m21 195 3 4 4-4-4-5ZM129 23l3 4 4-4-4-5Z" fill="#b9446f"/>
 </svg>;
}

/** A quieter, engraved court card to frame the Joker. */
export function CourtArtwork({rank,suit}:{rank:'J'|'K';suit:'♠'|'♦'}){
 const portrait=useId();
 const color=suit==='♦'?'#a44762':'#244f70';
 return <svg viewBox="0 0 150 218" aria-hidden="true" className="court-artwork">
  <defs><g id={portrait} stroke={color} strokeWidth="1.7" strokeLinejoin="round" fill="none">
   <path d="M33 109 40 85 60 76h30l20 11 7 22" fill="#dfd8c5"/>
   <path d="m47 84 28 25 26-25M56 80l38 29m-49-5 14-14m28 16 14-14"/>
   <path d="M59 48h31l-3 22-12 10-12-8Z" fill="#fffaf0"/>
   <path d="m58 48-4-18 13 6 8-15 9 15 13-6-5 18Z" fill="#c3ad70"/>
   <path d="M60 43h30M66 55h3m11 0h3m-8 2-2 7h5m-10 5 10 1"/>
   <path d="m36 109 5-49m-5 1 5-18 6 18Zm69 48 7-48m-6 0 7-15 5 17"/>
   <path d="m69 92 6-6 6 6-6 7Z" fill="#c3ad70"/>
  </g></defs>
  <rect x="2" y="2" width="146" height="214" rx="6" fill="#f3eddd" stroke="#203040" strokeWidth="3"/>
  <rect x="9" y="9" width="132" height="200" rx="3" fill="none" stroke={color} strokeWidth="1.2"/>
  <rect x="29" y="18" width="92" height="182" fill="none" stroke={color}/>
  <use href={'#'+portrait}/><use href={'#'+portrait} transform="rotate(180 75 109)"/>
  <path d="M30 109h90" stroke={color}/>
  {[false,true].map(invert=><g key={String(invert)} transform={invert?'rotate(180 75 109)':undefined} fill={color} fontFamily="Georgia,serif" fontWeight="bold" textAnchor="middle">
   <text x="19" y="29" fontSize="22">{rank}</text><text x="19" y="47" fontSize="17">{suit}</text>
  </g>)}
 </svg>;
}
