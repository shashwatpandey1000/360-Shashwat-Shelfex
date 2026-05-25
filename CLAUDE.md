# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

Two independent apps — run and install dependencies separately in each:

```
360-Shashwat-Shelfex/
├── client/   # Next.js 16 frontend (port 3001)
└── server/   # Express 5 API server (port 4000)
```

## Development Commands

### Client (`cd client`)
```bash
npm run dev          # Start dev server on port 3001
npm run build        # Production build
npm run format       # Prettier format
npm run format:check # Check formatting
npx tsc --noEmit     # TypeScript check
```

### Server (`cd server`)
```bash
npm run dev          # Start with ts-node-dev (hot reload)
npm run build        # Compile to dist/
npm run format       # Prettier format

# Database (Drizzle ORM + Neon PostgreSQL)
npm run db:generate  # Generate migrations from schema changes
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema directly (dev shortcut)
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed database

# One-off jobs
npm run job:retry-approval-emails
```

## Environment Setup

**Client** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SSO_API_URL=https://sso-self.vercel.app/api/v1
NEXT_PUBLIC_CLIENT_ID=shelf360
NEXT_PUBLIC_CALLBACK_URL=http://localhost:3001/auth/callback
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

**Server** (`.env`):
```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://...
CORS_ORIGIN=http://localhost:3001
SSO_API_URL=https://sso-self.vercel.app/api/v1
SSO_CLIENT_ID=shelf360
SSO_CLIENT_SECRET=shelf360-dev-secret-2025
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@shelfexecution.com
```

## Architecture

### Server (`server/src/`)

**Request pipeline:**
```
Route → authMiddleware → requirePermission('resource:action') → validate(zodSchema) → controller → service
```

**Directory layout:**
- `app.ts` — Express app, middleware stack, route mounting
- `server.ts` — HTTP server, cron jobs (slot materialization runs daily at 02:00 UTC)
- `routes/` — Route definitions per domain
- `controllers/` — Thin request handlers (parse input, call service, return `ApiResponse`)
- `services/` — Business logic
- `middlewares/` — `auth`, `permission`, `error`, `rateLimiter`, `validation`
- `db/schema/` — Drizzle ORM table definitions (users, organizations, stores, zones, schedule, surveys, tours, lookups)
- `db/index.ts` — Neon serverless driver + Drizzle instance
- `utils/ApiResponse.ts` — Standardised response builder: `ApiResponse.success()`, `.created()`, `.error()`, `.badRequest()`, `.unauthorized()`, `.forbidden()`, `.notFound()`
- `utils/permissions.ts` — Permission string registry (`stores:read`, `employees:write`, etc.)

**API base:** `/api/v1` — routes: `/health`, `/auth`, `/orgs`, `/stores`, `/zones`, `/employees`, `/schedules`, `/tours`, `/surveys`, `/lookups`, `/admin`

**Response envelope:**
```json
{ "success": true, "message": "...", "data": { ... } }
```

### Client (`client/`)

**Directory layout:**
- `app/` — Next.js App Router pages
  - `app/auth/` — OAuth callback and error pages
  - `app/onboarding/` — First-time org setup flow
  - `app/dashboard/` — Main app (employees, stores, schedule, surveys, settings)
- `components/ui/` — shadcn/ui base components
- `components/common/` — Shared app components
- `components/schedule/` — Schedule-specific components
- `contexts/auth-context.tsx` — Global auth state; provides `useAuth()` with `user`, `accessMap`, `hasPermission()`, `hasModule()`
- `lib/api/client.ts` — Axios instance; auto-refreshes on 401 "Token expired" (queues concurrent requests)
- `lib/api/*.api.ts` — Domain API objects (`authApi`, `employeesApi`, `storesApi`, `zonesApi`, `surveysApi`, `toursApi`, `scheduleApi`, `orgApi`, `lookupsApi`)
- `lib/api/index.ts` — Barrel export for all APIs and types
- `hooks/queries/use*Queries.ts` — TanStack Query `useQuery` hooks per domain
- `hooks/mutations/use*Mutations.ts` — TanStack Query `useMutation` hooks per domain
- `providers/TanstackProvider.tsx` — `QueryClient` provider (wraps root layout)
- `middleware.ts` — Edge middleware: validates OAuth state/PKCE, checks JWT, refreshes tokens, redirects to SSO

**Provider hierarchy in `app/layout.tsx`:**
```tsx
ThemeProvider → TanstackProvider → AuthProvider → {children}
```

## Authentication Flow

This project uses an external SSO service (`sso-self.vercel.app`) with OAuth 2.0 + PKCE.

1. **Unauthenticated request** → client middleware redirects to SSO login
2. **OAuth callback** (`/auth/callback`) → client exchanges code for tokens via `POST /api/v1/auth/callback`
3. **Server auth middleware** — verifies JWT (issuer: `accounts.shelfex.com`, audience: `shelfex-services`), looks up local 360 user by SSO ID, builds `accessMap` (permissions + scope + modules), sets `req.user`, `req.accessMap`, `req.orgId`
4. **Token refresh** — client axios interceptor catches 401 with message "Token expired", calls `POST /api/v1/auth/refresh`, retries the original request; client middleware does the same at the edge

**`req.accessMap`** on every authenticated server request:
```ts
{
  orgId: string;
  userId: string;
  roleTemplate: string;
  scopeType: 'org' | 'zones' | 'stores';
  scopeEntityIds: string[];
  permissions: Permission[];   // e.g. 'stores:read', 'employees:write'
  modules: string[];
  orgStatus: string;
}
```

## TanStack Query Pattern

All data fetching uses TanStack Query v5. Query keys follow this convention:
- List: `["employees", params]`
- Single: `["employee", id]`
- Nested: `["scheduleTemplate", id]`

Query hooks use `placeholderData: keepPreviousData` for paginated lists and `enabled: !!id` for conditional fetches. Mutation hooks call `queryClient.invalidateQueries()` in `onSuccess` to keep the cache consistent.

## Database Schema

Drizzle ORM schema files in `server/src/db/schema/`:
- `users.ts` — org users, SSO link, role templates, scope
- `organizations.ts` — org settings, registration state
- `stores.ts` — stores, store categories
- `zones.ts` — zone hierarchy
- `schedule.ts` — templates → recurrence rules → time windows → materialized slots + persistent assignments
- `surveys.ts` — survey instances and photos
- `tours.ts` — virtual tours and panoramic scenes
- `lookups.ts` — industries, reference data
- `forms.ts`, `notifications.ts` — supporting tables

When changing the schema, run `db:generate` then `db:migrate` (or `db:push` in dev).

## Adding a New API Endpoint

1. Add schema to `server/src/db/schema/` if needed, then `db:generate` + `db:migrate`
2. Create/update service in `server/src/services/`
3. Add controller method in `server/src/controllers/`
4. Register route in `server/src/routes/` with `authMiddleware`, `requirePermission`, and Zod validation
5. Add the API function to the relevant `client/lib/api/*.api.ts` file and export from `client/lib/api/index.ts`
6. Add a query hook in `client/hooks/queries/` or mutation hook in `client/hooks/mutations/`
