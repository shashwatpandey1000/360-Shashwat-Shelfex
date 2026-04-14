import { Request, Response } from 'express';
import axios from 'axios';
import logger from '../utils/logger';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const SSO_API_URL = process.env.SSO_API_URL!;
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID!;
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET!;
const SSO_CALLBACK_URL = process.env.SSO_CALLBACK_URL!;

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS_ACCESS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 1000, // 1 hour
  path: '/',
};

const COOKIE_OPTIONS_REFRESH = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

// POST /auth/callback - Exchange authorization code for tokens
export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { code, code_verifier } = req.body; // validated by Zod middleware

  try {
    const tokenResponse = await axios.post(`${SSO_API_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: SSO_CALLBACK_URL,
      client_id: SSO_CLIENT_ID,
      client_secret: SSO_CLIENT_SECRET,
      ...(code_verifier && { code_verifier }),
    });

    const { access_token, refresh_token } = tokenResponse.data;

    res.cookie('access_token', access_token, COOKIE_OPTIONS_ACCESS);
    res.cookie('refresh_token', refresh_token, COOKIE_OPTIONS_REFRESH);

    logger.info(`Token exchange successful for code: ${code.substring(0, 8)}...`);

    ApiResponse.success(res, null, 'Authentication successful');
  } catch (error: any) {
    logger.error(`Token exchange failed: ${error.response?.data?.message || error.message}`);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Token exchange failed';

    ApiResponse.error(res, message, status);
  }
});

// GET /auth/me - Get current user + access map
export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    ApiResponse.unauthorized(res);
    return;
  }

  // Return SSO identity + 360 access map (if user exists in 360)
  ApiResponse.success(res, {
    user: {
      email: req.user.email,
      emailVerified: req.user.emailVerified,
    },
    accessMap: req.accessMap || null, // null = authenticated via SSO but not registered in 360 yet
  });
});

// POST /auth/refresh - Refresh access token via SSO
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    ApiResponse.unauthorized(res, 'No refresh token');
    return;
  }

  try {
    const tokenResponse = await axios.post(`${SSO_API_URL}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = tokenResponse.data.data;

    res.cookie('access_token', accessToken, COOKIE_OPTIONS_ACCESS);

    if (newRefreshToken) {
      res.cookie('refresh_token', newRefreshToken, COOKIE_OPTIONS_REFRESH);
    }

    logger.info('Token refreshed successfully');

    ApiResponse.success(res, null, 'Token refreshed');
  } catch (error: any) {
    logger.error(`Token refresh failed: ${error.response?.data?.message || error.message}`);

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    ApiResponse.unauthorized(res, 'Token refresh failed');
  }
});

// POST /auth/logout - Clear auth cookies and revoke SSO refresh token
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;

  if (refreshToken) {
    try {
      await axios.post(
        `${SSO_API_URL}/auth/logout`,
        {},
        {
          headers: { Cookie: `refresh_token=${refreshToken}` },
          withCredentials: true,
        },
      );
    } catch (err: any) {
      logger.warn(`SSO token revocation failed (non-blocking): ${err.message}`);
    }
  }

  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });

  logger.info('User logged out');

  ApiResponse.success(res, null, 'Logged out successfully');
});
