import { NextRequest, NextResponse } from 'next/server';
export function middleware(request:NextRequest){
 if(process.env.LOCAL_PREVIEW==='1'&&process.env.NODE_ENV==='development'&&!request.nextUrl.pathname.startsWith('/api/local/')){
  const url=request.nextUrl.clone();url.pathname='/api/local/'+url.pathname.slice(5);
  return NextResponse.rewrite(url);
 }
 return NextResponse.next();
}
export const config={matcher:'/api/:path*'};
