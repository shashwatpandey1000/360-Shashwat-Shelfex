import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    // Tell the 360 server to logout (so it can revoke tokens)
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(refreshToken && { Cookie: `refresh_token=${refreshToken}` }),
      },
    }).catch(() => {}); // Best-effort

    // Clear cookies on the client domain
    const nextResponse = NextResponse.json({ success: true, message: 'Logged out' });
    nextResponse.cookies.delete('access_token');
    nextResponse.cookies.delete('refresh_token');

    return nextResponse;
  } catch (error: any) {
    console.error('Auth logout proxy error:', error);
    const nextResponse = NextResponse.json({ success: true, message: 'Logged out' });
    nextResponse.cookies.delete('access_token');
    nextResponse.cookies.delete('refresh_token');
    return nextResponse;
  }
}
