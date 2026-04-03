import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token' },
        { status: 401 },
      );
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Clear cookies on refresh failure
      const nextResponse = NextResponse.json(data, { status: response.status });
      nextResponse.cookies.delete('access_token');
      nextResponse.cookies.delete('refresh_token');
      return nextResponse;
    }

    // Forward Set-Cookie headers from 360 server
    const setCookieHeaders = response.headers.getSetCookie();
    const nextResponse = NextResponse.json(data);

    for (const cookie of setCookieHeaders) {
      nextResponse.headers.append('Set-Cookie', cookie);
    }

    return nextResponse;
  } catch (error: any) {
    console.error('Auth refresh proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Token refresh failed' },
      { status: 500 },
    );
  }
}
