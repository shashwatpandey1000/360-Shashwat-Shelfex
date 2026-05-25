import { NextResponse } from 'next/server';

// Clears all auth cookies from the Next.js server side.
// Called in parallel with the Express /auth/logout so cookies are
// definitively cleared regardless of which server responds first.
export async function POST() {
  const response = NextResponse.json({ success: true });
  const cleared = { maxAge: 0, path: '/' };
  response.cookies.set('access_token', '', cleared);
  response.cookies.set('refresh_token', '', cleared);
  response.cookies.set('user_permissions', '', cleared);
  return response;
}
