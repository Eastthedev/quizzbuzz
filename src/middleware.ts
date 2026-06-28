import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Guard Admin API endpoints
  if (pathname.startsWith('/api/admin/')) {
    const session = await getSessionUser(request);
    if (!session || session.role !== 'admin') {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized: Admin access required.' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // 2. Guard Admin Portal Pages (exclude /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = await getSessionUser(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 3. Guard Student Portal Pages
  if (
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/onboarding') || 
    pathname.startsWith('/quiz')
  ) {
    const session = await getSessionUser(request);
    if (!session || session.role !== 'user') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*', 
    '/api/admin/:path*', 
    '/dashboard/:path*', 
    '/onboarding/:path*', 
    '/quiz/:path*'
  ],
};
