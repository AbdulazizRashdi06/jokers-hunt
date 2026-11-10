import { action,adminAuth } from '@/lib/server';
import { getLeaderboard } from '@/lib/leaderboard';
import { NextResponse } from 'next/server';
const cell=(v:unknown)=>{
 let s=String(v??'');
 if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r]/.test(s)) s="'"+s; // mitigate spreadsheet formula injection
 return '"'+s.replace(/"/g,'""')+'"';
};
export const GET=action(async()=>{
 await adminAuth();
 const rows=await getLeaderboard();
 const output=[['Rank','Team','Completed Stages','Total Stages','Finished','Elapsed Seconds'].join(','),
  ...rows.map(x=>[x.rank,x.name,x.stages,x.total,x.finished?'Yes':'No',x.elapsedSeconds??''].map(cell).join(','))
 ].join('\r\n');
 return new NextResponse('\ufeff'+output,{headers:{
  'Content-Type':'text/csv; charset=utf-8',
  'Content-Disposition':'attachment; filename="jokers-hunt-leaderboard.csv"',
  'Cache-Control':'no-store'
 }});
});
