import { NextRequest,NextResponse } from 'next/server';
import { localRequest } from '@/lib/local-preview';
export const runtime='nodejs';
async function handle(r:NextRequest){
 if(process.env.LOCAL_PREVIEW!=='1'||process.env.NODE_ENV!=='development')return new NextResponse(null,{status:404});
 return localRequest(r);
}
export {handle as GET,handle as POST,handle as DELETE};
