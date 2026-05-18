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

    // State is valid — clear all OAuth flow cookies and proceed
    const response = NextResponse.next();
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_nonce');
    return response;
  }

  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const refreshResult = await tryRefreshToken(request);
    if (refreshResult) return refreshResult;
    return await redirectToSSO(request);
  }

  // Check if token is expired (decode without verification — verification happens server-side)
  const decoded = decodeJwtPayload(accessToken);
  if (!decoded || typeof decoded.exp !== 'number' || decoded.exp * 1000 < Date.now()) {
    const refreshResult = await tryRefreshToken(request);
    if (refreshResult) return refreshResult;
    return await redirectToSSO(request);
  }

  return NextResponse.next();
}

async function tryRefreshToken(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) return null;

  // Optionally check if the refresh token itself is expired (30d JWT)
  const decoded = decodeJwtPayload(refreshToken);
  if (decoded && typeof decoded.exp === 'number' && decoded.exp * 1000 < Date.now()) {
    return null; // Refresh token expired, no point trying
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    if (!refreshResponse.ok) return null;

    const body = await refreshResponse.json();
    const newAccessToken = body?.data?.accessToken;
    if (!newAccessToken) return null;

    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.next();

    // Set the new access_token cookie on the client domain so subsequent
    // middleware checks see a valid token without another refresh round-trip
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour (seconds)
      path: '/',
    });

    // Rotate refresh token if the server issued a new one
    const newRefreshToken = body?.data?.refreshToken;
    if (newRefreshToken) {
      response.cookies.set('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days (seconds)
        path: '/',
      });
    }

    return response;
  } catch {
    return null; // Refresh failed, fall through to SSO redirect
  }
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
  const ssoUrl = process.env.NEXT_PUBLIC_SSO_API_URL || 'http://localhost:8000/api/v1';
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'shelf360';
  const callbackUrl = process.env.NEXT_PUBLIC_CALLBACK_URL || 'http://localhost:3001/auth/callback';

  // Reuse in-flight OAuth cookies if they exist — multiple concurrent requests
  // (prefetch, assets) can all trigger this function and overwrite the state
  // cookie, causing a mismatch when the SSO callback arrives with the original state.
  const existingState = request.cookies.get('oauth_state')?.value;
  const existingVerifier = request.cookies.get('pkce_verifier')?.value;
  const existingNonce = request.cookies.get('oauth_nonce')?.value;

  const state = existingState || crypto.randomUUID();
  const codeVerifier = existingVerifier || generateCodeVerifier();
  const nonce = existingNonce || crypto.randomUUID();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

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

  // Always write cookies with the values we're actually using. This ensures
  // pkce_verifier stays in sync with the code_challenge sent to SSO — even
  // when oauth_state is stale but pkce_verifier was already cleared by a
  // previous callback attempt, which would cause "code_verifier required".
  response.cookies.set('oauth_state', state, cookieOptions);
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
