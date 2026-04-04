import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

const SSO_API_URL = process.env.SSO_API_URL!;
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID!;
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET!;
const SSO_CALLBACK_URL = process.env.SSO_CALLBACK_URL!;

// POST /auth/callback - Exchange authorization code for tokens
export const callback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, state, code_verifier } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        message: 'Authorization code is required',
      });
      return;
    }

    // Exchange code for tokens with SSO (include PKCE code_verifier if present)
    const tokenResponse = await axios.post(`${SSO_API_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: SSO_CALLBACK_URL,
      client_id: SSO_CLIENT_ID,
      client_secret: SSO_CLIENT_SECRET,
      ...(code_verifier && { code_verifier }),
    });

    const { access_token, refresh_token, id_token } = tokenResponse.data;

    const isProduction = process.env.NODE_ENV === 'production';

    // Set httpOnly cookies
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour (matches JWT expiry)
      path: '/',
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    logger.info(`Token exchange successful for code: ${code.substring(0, 8)}...`);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
    });
  } catch (error: any) {
    logger.error(`Token exchange failed: ${error.response?.data?.message || error.message}`);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Token exchange failed';

    res.status(status).json({
      success: false,
      message,
    });
  }
};

// GET /auth/me - Get current user from token
export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        userId: req.user.userId,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /auth/refresh - Refresh access token via SSO
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'No refresh token',
      });
      return;
    }

    const tokenResponse = await axios.post(`${SSO_API_URL}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = tokenResponse.data.data;

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour (matches JWT expiry)
      path: '/',
    });

    // Update refresh token cookie (SSO rotates refresh tokens)
    if (newRefreshToken) {
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }

    logger.info('Token refreshed successfully');

    res.status(200).json({
      success: true,
      message: 'Token refreshed',
    });
  } catch (error: any) {
    logger.error(`Token refresh failed: ${error.response?.data?.message || error.message}`);

    // Clear cookies on refresh failure
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    res.status(401).json({
      success: false,
      message: 'Token refresh failed',
    });
  }
};

// POST /auth/logout - Clear auth cookies and revoke SSO refresh token
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    // Revoke the refresh token at SSO server (best-effort, don't block logout)
    if (refreshToken) {
      try {
        await axios.post(`${SSO_API_URL}/auth/logout`, {}, {
          headers: { Cookie: `refresh_token=${refreshToken}` },
          withCredentials: true,
        });
      } catch (err: any) {
        logger.warn(`SSO token revocation failed (non-blocking): ${err.message}`);
      }
    }

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    logger.info('User logged out');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
