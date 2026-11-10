/** @type {import('next').NextConfig} */
const nextConfig = {
 reactStrictMode: true,
 async headers() {
  return [{
   source:'/:path*',
   headers:[
    {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'"+(process.env.NODE_ENV==='development'?" 'unsafe-eval'":'')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"},
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'no-referrer'},
    {key:'Permissions-Policy',value:'camera=(self), microphone=()'}
   ]
  }];
 }
};
export default nextConfig;
