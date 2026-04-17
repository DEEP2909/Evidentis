import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js middleware for per-request nonce-based CSP.
 * Replaces the static 'unsafe-inline' / 'unsafe-eval' CSP
 * with a cryptographic nonce for each request.
 */
export function middleware(request: NextRequest) {
  // Next.js dev server relies on eval and dynamically injected scripts.
  // Enforcing strict CSP in development or CI without full nonce injection breaks hydration.
  if (
    process.env.NODE_ENV !== 'production' || 
    process.env.CI === 'true' || 
    process.env.DISABLE_CSP === 'true'
  ) {
    return NextResponse.next();
  }

  // Generate a random nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Build strict CSP with nonce
  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https:`,
    `connect-src 'self' http://localhost:* ws://localhost:* https:`,
    `frame-ancestors 'none'`,
  ].join('; ');

  // Clone request headers and add nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set security headers on the response
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (Next.js API routes — not used, but future-proof)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icons, etc.
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
