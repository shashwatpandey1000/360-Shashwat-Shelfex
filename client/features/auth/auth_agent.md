# Auth Feature

## 1. Overview
Handles the OAuth 2.0 + PKCE authentication flow with the external SSO service.
Manages the callback exchange, token storage, and logout. The global `AuthProvider`
(in `contexts/auth-context.tsx`) owns the user session state; this feature owns
the API layer and page-level components for the auth flow pages.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Raw async functions: callbackExchange, refreshToken, logout, getMe |
| queries.ts | useCurrentUserQuery — fetches current user + accessMap |
| mutations.ts | useLoginCallbackMutation, useLogoutMutation |
| types.ts | AuthUser, AuthCallbackParams interfaces |
| components/CallbackHandler.tsx | Handles /auth/callback page — exchanges code for tokens |
| components/AuthError.tsx | Displays auth error states from /auth/error |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `CallbackHandler`, `AuthError`, `useCurrentUserQuery`, `useLoginCallbackMutation`, `useLogoutMutation`

## 4. Core Rules & Edge Cases
- The callback page receives `code` and `state` as URL search params; reads `pkce_verifier` from cookies
- On successful callback, tokens are stored in cookies (handled by the server response's Set-Cookie)
- `useCurrentUserQuery` is used by `AuthProvider` to bootstrap session on app load
- Logout clears cookies server-side via POST, then redirects to SSO logout URL
- Auth errors are categorized by `reason` query param: `forbidden` shows Access Denied, anything else shows Authentication Required
- React StrictMode double-invoke guard uses sessionStorage key `auth_callback_<code>` to prevent duplicate one-time-use code exchange
