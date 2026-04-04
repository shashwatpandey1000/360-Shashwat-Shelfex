import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Decode JWT payload without verification (Edge Runtime compatible)
// Verification happens server-side in the 360 API auth middleware
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth error page - always accessible
  if (pathname.startsWith('/auth/error')) {
    return NextResponse.next();
  }

  // OAuth callback - validate state parameter to prevent CSRF
  if (pathname.startsWith('/auth/callback')) {
    const state = request.nextUrl.searchParams.get('state');
    const storedState = request.cookies.get('oauth_state')?.value;

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL('/auth/error?reason=invalid_state', request.url));
    }

    // State is valid — clear the cookie and proceed
    const response = NextResponse.next();
    response.cookies.delete('oauth_state');
    return response;
  }

  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    return await redirectToSSO(request);
  }

  // Check if token is expired (decode without verification — verification happens server-side)
  const decoded = decodeJwtPayload(accessToken);
  if (!decoded || typeof decoded.exp !== 'number' || decoded.exp * 1000 < Date.now()) {
    return await redirectToSSO(request);
  }

  return NextResponse.next();
}

function generateCodeVerifier(): string {
  // 43-128 chars of unreserved characters (RFC 7636)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  // S256: BASE64URL(SHA256(code_verifier))
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function redirectToSSO(request: NextRequest) {
  const ssoUrl = process.env.NEXT_PUBLIC_SSO_URL || 'http://localhost:8000/api/v1';
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'shelf360';
  const callbackUrl = process.env.NEXT_PUBLIC_CALLBACK_URL || 'http://localhost:3001/auth/callback';

  // Generate CSRF state
  const state = crypto.randomUUID();

  // Generate PKCE code_verifier and code_challenge (S256)
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Generate OpenID Connect nonce
  const nonce = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    nonce,
  });

  const authorizeUrl = `${ssoUrl}/oauth/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  };

  response.cookies.set('oauth_state', state, cookieOptions);
  // PKCE verifier must be readable by callback page JS to send to server
  response.cookies.set('pkce_verifier', codeVerifier, {
    ...cookieOptions,
    httpOnly: false,
  });
  response.cookies.set('oauth_nonce', nonce, cookieOptions);

  return response;
}

export const config = {
  matcher: [
    // Protect everything except public assets and auth error page
    // /auth/callback MUST go through middleware for OAuth state validation
    '/((?!_next/static|_next/image|favicon.ico|auth/error).*)',
  ],
};
