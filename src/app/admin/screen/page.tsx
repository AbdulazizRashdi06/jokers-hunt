import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/server';
import LiveLeaderboard from '@/components/LiveLeaderboard';
export const dynamic='force-dynamic';
export default async function Screen(){
 let allowed=false;try{await adminAuth();allowed=true;}catch{}
 if(!allowed)redirect('/admin');
 return <LiveLeaderboard/>;
}
