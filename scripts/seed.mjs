import { createClient } from '@supabase/supabase-js';
import { createHmac, createCipheriv, randomBytes } from 'node:crypto';

const need=n=>{if(!process.env[n])throw new Error(`Missing ${n}. Copy .env.example to .env.local and fill it in.`);return process.env[n]};
const db=createClient(need('SUPABASE_URL'),need('SUPABASE_SERVICE_ROLE_KEY'),{
 auth:{persistSession:false,autoRefreshToken:false}
});
const secret=need('GAME_SECRET'),key=Buffer.from(need('GAME_ENCRYPTION_KEY'),'hex');
if(key.length!==32)throw new Error('GAME_ENCRYPTION_KEY needs 64 hexadecimal characters.');
const keyed=s=>createHmac('sha256',secret).update(s).digest('hex');
const seal=s=>{
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([c.update(s,'utf8'),c.final()]);
 return Buffer.concat([iv,c.getAuthTag(),ciphertext]).toString('base64');
};
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const backup=()=>[...randomBytes(8)].map(b=>alphabet[b%alphabet.length]).join('');
const samples=[
 {
  title:'The Whispering Card',suit:'♠',location:'[Campus Location 1 — edit in Admin]',
  clue:'Your first card hides where the organizers place the Stage 1 checkpoint. Look for the Joker-marked QR sign at [Campus Location 1].',
  hint:'Ask an organizer to confirm the Stage 1 physical checkpoint. This is a location placeholder.',
  question:'I speak without a mouth and hear without ears. I have no body, but I come alive with sound. What am I?',
  answer:'ECHO'
 },
 {
  title:'Three Is a Crowd',suit:'♥',location:'[Campus Location 2 — edit in Admin]',
  clue:'The second card is waiting at [Campus Location 2]. A pair of eyes may miss what a team can find.',
  hint:'The physical location is not set yet. The answer is about pairs.',
  question:'Three students all shake hands with one another exactly once. How many handshakes happen?',
  answer:'3'
 },
 {
  title:'The Secret Alphabet',suit:'♦',location:'[Campus Location 3 — edit in Admin]',
  clue:'The third checkpoint belongs at [Campus Location 3]. Your next card likes to keep secrets.',
  hint:'For the puzzle, move every letter back by three in the alphabet.',
  question:'Decode the word MRNHU using a Caesar shift of three letters backwards. What word appears?',
  answer:'JOKER'
 },
 {
  title:'A Matter of Suits',suit:'♣',location:'[Campus Location 4 — edit in Admin]',
  clue:'The fourth checkpoint is waiting at [Campus Location 4]. The playing cards are trying to tell you something.',
  hint:'The red suits are hearts and diamonds. One is symmetrical from top to bottom.',
  question:'In a standard deck, which red suit has a point at both the top and bottom of its symbol?',
  answer:'DIAMONDS'
 },
 {
  title:'The Final Key',suit:'★',location:'[Campus Location 5 — edit in Admin]',
  clue:'One last secret: find the final Joker-marked checkpoint at [Campus Location 5]. Finish this riddle to reveal the Joker.',
  hint:'Think of a device you use when typing.',
  question:'I have keys but no locks, space but no rooms, and Enter but no doorway. What am I?',
  answer:'KEYBOARD'
 }
];
const {count,error}=await db.from('stages').select('*',{count:'exact',head:true});
if(error)throw error;
if(count>0){console.log(`Already have ${count} stages. No changes made.`);process.exit(0);}
const data=samples.map((s,i)=>{
 const qr=randomBytes(24).toString('base64url'),b=backup();
 return {
  position:i+1,title:s.title,suit:s.suit,location_label:s.location,
  clue:s.clue,hint:s.hint,question:s.question,
  answer_hash:keyed('answer:'+s.answer.toUpperCase()),answer_ciphertext:seal(s.answer),
  qr_hash:keyed('checkpoint:'+qr.toUpperCase()),qr_ciphertext:seal(qr),
  backup_hash:keyed('checkpoint:'+b),backup_ciphertext:seal(b),
  enabled:true,staff_only:false
 };
});
const {error:insertError}=await db.from('stages').insert(data);
if(insertError)throw insertError;
console.log('Created 5 sample stages. Open /admin to edit locations, riddles and QR codes.');
