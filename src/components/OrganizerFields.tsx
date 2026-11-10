'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function OrganizerFields(){
 const [visible,setVisible]=useState(false);
 return <>
  <label>EMAIL<input name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="Your organizer email"/></label>
  <label>PASSWORD<span className="password-field"><input name="password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={1024} placeholder="Your password"/>
   <button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button>
  </span></label>
 </>;
}
