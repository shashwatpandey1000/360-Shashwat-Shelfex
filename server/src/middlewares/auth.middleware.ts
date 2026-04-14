import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { ApiResponse } from '../utils/ApiResponse';
import { buildAccessMap, findUserBySsoId, findUserByEmail, linkSsoAccount, AccessMap } from '../services/accessMap.service';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  emailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      accessMap?: AccessMap;
      orgId?: string;
    }
  }
}

// Auth middleware: verifies JWT + loads access map from 360 DB
// For routes that need permissions, use this. For public routes, don't.
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      ApiResponse.unauthorized(res);
      return;
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!, {
      issuer: 'accounts.shelfex.com',
      audience: 'shelfex-services',
    }) as AccessTokenPayload;

    req.user = decoded;

    // Look up 360 user by SSO user ID
    let localUser = await findUserBySsoId(decoded.userId);

    // Account linking: if no user found by sso_user_id, check if there's an
    // invited user (sso_user_id = null) with a matching email → link accounts
    if (!localUser) {
      const invitedUser = await findUserByEmail(decoded.email);
      if (invitedUser && !invitedUser.ssoUserId && invitedUser.status === 'pending_first_login') {
        logger.info(`Linking SSO account ${decoded.userId} to invited user ${invitedUser.id} (${decoded.email})`);
        localUser = await linkSsoAccount(invitedUser.id, decoded.userId);
      }
    }

    // Build access map if user exists
    if (localUser) {
      const accessMap = await buildAccessMap(localUser.id);
      if (accessMap) {
        req.accessMap = accessMap;
        req.orgId = accessMap.orgId;
      }
    }
    // If no local user exists yet (e.g., during org registration), that's okay
    // req.accessMap will be undefined — protected routes check for it

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      ApiResponse.unauthorized(res, 'Token expired');
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      ApiResponse.unauthorized(res, 'Invalid token');
      return;
    }

    logger.error(`Auth middleware error: ${error}`);
    ApiResponse.unauthorized(res, 'Authentication failed');
  }
};
