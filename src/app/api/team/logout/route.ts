import { NextRequest } from 'next/server';
import { action,db,sha,json } from '@/lib/server';
export const POST=action(async()=>{
 const { cookies }=await import('next/headers');
 const token=(await cookies()).get('joker_team')?.value;
 if(token) await db.from('team_sessions').delete().eq('token_hash',sha(token));
 const res=json({ok:true});res.cookies.delete('joker_team');return res;
});
