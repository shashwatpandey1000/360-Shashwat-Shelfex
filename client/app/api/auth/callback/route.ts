import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the callback to the 360 server
    const response = await fetch(`${API_URL}/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Extract Set-Cookie headers from the 360 server response
    const setCookieHeaders = response.headers.getSetCookie();

    // Build response and forward the cookies (they'll now be set on the client's domain)
    const nextResponse = NextResponse.json(data);

    for (const cookie of setCookieHeaders) {
      nextResponse.headers.append('Set-Cookie', cookie);
    }

    return nextResponse;
  } catch (error: any) {
    console.error('Auth callback proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 },
    );
  }
}
