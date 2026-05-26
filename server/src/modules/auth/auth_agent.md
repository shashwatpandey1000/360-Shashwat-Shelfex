# Auth Module

## 1. Overview
Handles OAuth 2.0 + PKCE authentication via the external SSO service (`sso-self.vercel.app`).
Manages token exchange, refresh, and logout. Does NOT manage passwords — all authentication
is delegated to the SSO provider. On successful callback, looks up the local 360 user by SSO ID
and builds the `accessMap` (permissions, scope, modules) which is attached to every subsequent request.

## 2. File Map
| File | Responsibility |
|------|---------------|
| auth.routes.ts | Route definitions: POST /callback, POST /refresh, POST /logout, GET /me |
| auth.controller.ts | Parse req, call SSO API or DB, return tokens/user data |
| auth.types.ts | Zod schemas for callback input, refresh input; inferred TS types |
| index.ts | Exports `authRouter` |

## 3. Public Contract
**Server exports:** `authRouter` (mounted at `/api/v1/auth`)

**Routes:**
- `POST /callback` — exchange OAuth code+verifier for tokens; creates/updates local user
- `POST /refresh` — refresh access token via SSO; returns new access token
- `POST /logout` — revoke refresh token
- `GET /me` — return current user profile + accessMap (requires auth)

## 4. Core Rules & Edge Cases
- Token verification uses JWT: issuer `accounts.shelfex.com`, audience `shelfex-services`
- On first SSO login, a local 360 user record is created (looked up by `sso_user_id`)
- `accessMap` is rebuilt on every `/me` call — not cached; always reflects current DB state
- Refresh tokens are stored in httpOnly cookies; access tokens in memory on the client
- If the SSO user has no matching local 360 user, return 403 with `no_local_user`
- `POST /callback` is rate-limited to prevent code replay attacks
