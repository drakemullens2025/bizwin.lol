import { NextRequest, NextResponse } from 'next/server';

// Route wildcard subdomains (coolio.bizwin.lol) to /store/[slug]
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const mainDomains = ['bizwin.lol', 'www.bizwin.lol', 'localhost:3000'];

  // Skip if this is the main domain or already a /store/ path
  if (mainDomains.some(d => host === d) || host.endsWith('.netlify.app')) {
    return NextResponse.next();
  }

  // Extract subdomain: "coolio.bizwin.lol" → "coolio"
  const subdomain = host.split('.')[0];
  if (!subdomain || subdomain === 'www') {
    return NextResponse.next();
  }

  // Rewrite to /store/[slug] internally (URL stays as subdomain for the user)
  const url = req.nextUrl.clone();
  url.pathname = `/store/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Run on all routes except static files and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|roboticon.jpg|robots2.png|api/).*)'],
};
