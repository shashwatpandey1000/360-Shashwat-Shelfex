# Client Modular Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `client/` from scattered `hooks/queries/`, `hooks/mutations/`, `lib/api/*.api.ts`, and `app/*/components/` into isolated `features/[domain]/` folders. Each feature contains all its own queries, mutations, API functions, components, types, and a `_agent.md` spec doc. Page files in `app/` become thin routing wrappers.

**Architecture:** TanStack Query (v5) for all data fetching and mutations. `mutations.ts` replaces the spec's `actions.ts`. Each feature's `index.ts` is its strict public contract. `lib/api/client.ts` (Axios singleton) is the only shared API utility that stays. `hooks/queries/`, `hooks/mutations/`, and `lib/api/*.api.ts` are deleted after migration.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, TanStack Query v5, Axios, shadcn/ui

---

## Import Transformation Rules

These rules apply to all files moved into `features/[f]/`:

| Old import | New import (from `features/[f]/`) |
|---|---|
| `from '@/lib/api'` (for domain APIs) | `from './api'` |
| `from '@/lib/api/client'` | `from '@/lib/api/client'` (unchanged — stays) |
| `from '@/hooks/queries/use[F]Queries'` | `from './queries'` (within same feature) |
| `from '@/hooks/mutations/use[F]Mutations'` | `from './mutations'` (within same feature) |
| `import apiClient from './client'` (in old api files) | `import apiClient from '@/lib/api/client'` |

---

## Task 1: Create features/ skeleton

**Files:**
- Create dirs: `client/features/auth/components/`
- Create dirs: `client/features/onboarding/components/`
- Create dirs: `client/features/employees/components/`
- Create dirs: `client/features/stores/components/`
- Create dirs: `client/features/zones/components/`
- Create dirs: `client/features/schedule/components/`
- Create dirs: `client/features/surveys/components/`
- Create dirs: `client/features/settings/components/`
- Create dirs: `client/features/lookups/`
- Create dirs: `client/features/tours/`

- [ ] **Step 1: Create all feature directories**

```bash
cd client
mkdir -p features/auth/components
mkdir -p features/onboarding/components
mkdir -p features/employees/components
mkdir -p features/stores/components
mkdir -p features/zones/components
mkdir -p features/schedule/components
mkdir -p features/surveys/components
mkdir -p features/settings/components
mkdir -p features/lookups
mkdir -p features/tours
```

- [ ] **Step 2: Commit skeleton**

```bash
git add features/
git commit -m "refactor(client): create features/ directory skeleton"
```

---

## Task 2: auth feature

**Files:**
- Create: `client/features/auth/auth_agent.md`
- Create: `client/features/auth/api.ts` ← from `lib/api/auth.api.ts`
- Create: `client/features/auth/queries.ts` ← from `hooks/queries/useAuthQueries.ts`
- Create: `client/features/auth/mutations.ts` ← from `hooks/mutations/useAuthMutations.ts`
- Create: `client/features/auth/types.ts`
- Create: `client/features/auth/components/CallbackHandler.tsx` ← logic from `app/auth/callback/page.tsx`
- Create: `client/features/auth/components/AuthError.tsx` ← logic from `app/auth/error/page.tsx`
- Create: `client/features/auth/index.ts`
- Modify: `client/app/auth/callback/page.tsx` → thin wrapper
- Modify: `client/app/auth/error/page.tsx` → thin wrapper

- [ ] **Step 1: Move auth API functions**

```bash
git mv lib/api/auth.api.ts features/auth/api.ts
```

Open `features/auth/api.ts`. Change the import:
```typescript
// Before:
import apiClient from './client';
// After:
import apiClient from '@/lib/api/client';
```

- [ ] **Step 2: Move auth queries**

```bash
git mv hooks/queries/useAuthQueries.ts features/auth/queries.ts
```

Open `features/auth/queries.ts`. Update imports:
```typescript
// Before:
import { authApi } from "@/lib/api";
// After:
import { authApi } from "./api";
```

- [ ] **Step 3: Move auth mutations**

```bash
git mv hooks/mutations/useAuthMutations.ts features/auth/mutations.ts
```

Open `features/auth/mutations.ts`. Update imports:
```typescript
// Before:
import { authApi } from "@/lib/api";
// After:
import { authApi } from "./api";
```

- [ ] **Step 4: Extract CallbackHandler component**

Create `client/features/auth/components/CallbackHandler.tsx`. Move the business logic currently in `app/auth/callback/page.tsx` into this component:

```typescript
'use client';

// Cut the entire component body from app/auth/callback/page.tsx and paste here.
// The component should handle the OAuth callback parameters, call the mutation,
// and redirect on success/failure.

export default function CallbackHandler() {
  // (paste the full implementation from the current callback page here)
}
```

Then reduce `app/auth/callback/page.tsx` to:
```typescript
import CallbackHandler from '@/features/auth/components/CallbackHandler';
export default function CallbackPage() {
  return <CallbackHandler />;
}
```

- [ ] **Step 5: Extract AuthError component**

Create `client/features/auth/components/AuthError.tsx`. Move the business logic from `app/auth/error/page.tsx`:

```typescript
'use client';

export default function AuthError() {
  // (paste the full implementation from the current error page here)
}
```

Then reduce `app/auth/error/page.tsx` to:
```typescript
import AuthError from '@/features/auth/components/AuthError';
export default function AuthErrorPage() {
  return <AuthError />;
}
```

- [ ] **Step 6: Create `client/features/auth/types.ts`**

```typescript
export interface AuthCallbackParams {
  code: string;
  state: string;
  codeVerifier: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  orgId: string;
  roleTemplate: string;
}
```

- [ ] **Step 7: Create `client/features/auth/index.ts`**

```typescript
export { default as CallbackHandler } from './components/CallbackHandler';
export { default as AuthError } from './components/AuthError';
export { useAuthMeQuery } from './queries';
export { useLogoutMutation, useAuthCallbackMutation } from './mutations';
export type { AuthUser } from './types';
```

- [ ] **Step 8: Create `client/features/auth/auth_agent.md`**

```markdown
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
| queries.ts | useAuthMeQuery — fetches current user + accessMap |
| mutations.ts | useAuthCallbackMutation, useLogoutMutation, useRefreshMutation |
| types.ts | AuthUser, AuthCallbackParams interfaces |
| components/CallbackHandler.tsx | Handles /auth/callback page — exchanges code for tokens |
| components/AuthError.tsx | Displays auth error states from /auth/error |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `CallbackHandler`, `AuthError`, `useAuthMeQuery`, `useLogoutMutation`, `useAuthCallbackMutation`

## 4. Core Rules & Edge Cases
- The callback page receives `code` and `state` as URL search params; reads `codeVerifier` from sessionStorage
- On successful callback, tokens are stored in cookies (handled by the server response's Set-Cookie)
- `useAuthMeQuery` is used by `AuthProvider` to bootstrap session on app load
- Logout clears cookies server-side via POST, then redirects to SSO logout URL
- Auth errors are categorized by `error` query param: `access_denied`, `invalid_state`, `server_error`
```

- [ ] **Step 9: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors for auth-related files.

- [ ] **Step 10: Commit**

```bash
git add features/auth/ app/auth/
git commit -m "refactor(client): extract auth feature"
```

---

## Task 3: onboarding feature

**Files:**
- Create: `client/features/onboarding/onboarding_agent.md`
- Create: `client/features/onboarding/components/OnboardingFlow.tsx`
- Create: `client/features/onboarding/components/OnboardingPending.tsx`
- Create: `client/features/onboarding/components/OnboardingRejected.tsx`
- Create: `client/features/onboarding/components/StepRail.tsx`
- Create: `client/features/onboarding/mutations.ts`
- Create: `client/features/onboarding/types.ts`
- Create: `client/features/onboarding/index.ts`
- Modify: `client/app/onboarding/page.tsx` → thin wrapper
- Modify: `client/app/onboarding/pending/page.tsx` → thin wrapper
- Modify: `client/app/onboarding/rejected/page.tsx` → thin wrapper

- [ ] **Step 1: Move StepRail component**

```bash
git mv app/onboarding/components/StepRail.tsx features/onboarding/components/StepRail.tsx
```

No import changes needed if StepRail has no internal imports.

- [ ] **Step 2: Extract OnboardingFlow from page.tsx**

Create `client/features/onboarding/components/OnboardingFlow.tsx`. Cut the full component implementation from `app/onboarding/page.tsx` and paste it here. Update any `@/lib/api` imports to use `./mutations` or `@/lib/api/client`.

Then replace `app/onboarding/page.tsx`:
```typescript
import OnboardingFlow from '@/features/onboarding/components/OnboardingFlow';
export default function OnboardingPage() {
  return <OnboardingFlow />;
}
```

- [ ] **Step 3: Extract OnboardingPending and OnboardingRejected**

Create `client/features/onboarding/components/OnboardingPending.tsx` — cut the body from `app/onboarding/pending/page.tsx`.

Create `client/features/onboarding/components/OnboardingRejected.tsx` — cut the body from `app/onboarding/rejected/page.tsx`.

Then reduce each page to:
```typescript
// app/onboarding/pending/page.tsx
import OnboardingPending from '@/features/onboarding/components/OnboardingPending';
export default function PendingPage() { return <OnboardingPending />; }

// app/onboarding/rejected/page.tsx
import OnboardingRejected from '@/features/onboarding/components/OnboardingRejected';
export default function RejectedPage() { return <OnboardingRejected />; }
```

- [ ] **Step 4: Create `client/features/onboarding/mutations.ts`**

Onboarding uses org mutations. Extract org-related mutations used during onboarding:

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orgApi } from '@/features/settings/api';
// Note: orgApi is currently in lib/api/org.api.ts — it moves to features/settings/api.ts in Task 9.
// Until Task 9, keep importing from '@/lib/api' temporarily:
import { orgApi } from '@/lib/api';

export function useRegisterOrgMutation() {
  return useMutation({
    mutationFn: (data: RegisterOrgData) => orgApi.register(data),
  });
}
```

- [ ] **Step 5: Create `client/features/onboarding/types.ts`**

```typescript
export interface OnboardingStep {
  id: number;
  label: string;
  completed: boolean;
}

export interface RegisterOrgData {
  name: string;
  industry: string;
  address: string;
  phone?: string;
}
```

- [ ] **Step 6: Create `client/features/onboarding/index.ts`**

```typescript
export { default as OnboardingFlow } from './components/OnboardingFlow';
export { default as OnboardingPending } from './components/OnboardingPending';
export { default as OnboardingRejected } from './components/OnboardingRejected';
export { default as StepRail } from './components/StepRail';
export { useRegisterOrgMutation } from './mutations';
```

- [ ] **Step 7: Create `client/features/onboarding/onboarding_agent.md`**

```markdown
# Onboarding Feature

## 1. Overview
Multi-step organization registration flow for first-time users. Guides new org admins through
providing org details, which are submitted to create a pending org record. After submission,
the user waits for super-admin approval before accessing the main dashboard.

## 2. File Map
| File | Responsibility |
|------|---------------|
| components/OnboardingFlow.tsx | Main multi-step registration form |
| components/StepRail.tsx | Step progress indicator sidebar |
| components/OnboardingPending.tsx | Waiting-for-approval screen |
| components/OnboardingRejected.tsx | Rejection notification screen |
| mutations.ts | useRegisterOrgMutation — submits org registration |
| types.ts | OnboardingStep, RegisterOrgData |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `OnboardingFlow`, `StepRail`, `OnboardingPending`, `OnboardingRejected`, `useRegisterOrgMutation`

## 4. Core Rules & Edge Cases
- Onboarding is only shown when user has no org or org status is `pending` / `rejected`
- Step progress is local state — not persisted until final submission
- After submission, user is redirected to `/onboarding/pending`; middleware polls org status
- If org is `rejected`, user lands on `/onboarding/rejected` and can re-apply
- The middleware handles routing: active orgs bypass onboarding, pending orgs land on pending page
```

- [ ] **Step 8: Commit**

```bash
git add features/onboarding/ app/onboarding/
git commit -m "refactor(client): extract onboarding feature"
```

---

## Task 4: employees feature

**Files:**
- Create: `client/features/employees/employees_agent.md`
- Create: `client/features/employees/api.ts` ← from `lib/api/employees.api.ts`
- Create: `client/features/employees/queries.ts` ← from `hooks/queries/useEmployeeQueries.ts`
- Create: `client/features/employees/mutations.ts` ← from `hooks/mutations/useEmployeeMutations.ts`
- Create: `client/features/employees/types.ts`
- Create: `client/features/employees/components/EmployeeList.tsx` ← extracted from `app/dashboard/employees/page.tsx`
- Create: `client/features/employees/components/EmployeeDetail.tsx` ← extracted from `app/dashboard/employees/[id]/page.tsx`
- Move: `client/app/dashboard/employees/components/AddEmployeeDialog.tsx` → `client/features/employees/components/AddEmployeeDialog.tsx`
- Create: `client/features/employees/index.ts`
- Modify: `client/app/dashboard/employees/page.tsx` → thin wrapper
- Modify: `client/app/dashboard/employees/[id]/page.tsx` → thin wrapper

- [ ] **Step 1: Move API, query, and mutation files**

```bash
git mv lib/api/employees.api.ts features/employees/api.ts
git mv hooks/queries/useEmployeeQueries.ts features/employees/queries.ts
git mv hooks/mutations/useEmployeeMutations.ts features/employees/mutations.ts
git mv app/dashboard/employees/components/AddEmployeeDialog.tsx features/employees/components/AddEmployeeDialog.tsx
```

- [ ] **Step 2: Update imports in `features/employees/api.ts`**

```typescript
import apiClient from '@/lib/api/client';
// (remove './client' import — change to '@/lib/api/client')
// rest of file unchanged
```

- [ ] **Step 3: Update imports in `features/employees/queries.ts`**

```typescript
// Before:
import { employeesApi, EmployeeListParams } from "@/lib/api";
// After:
import { employeesApi } from "./api";
import type { EmployeeListParams } from "./api";
```

- [ ] **Step 4: Update imports in `features/employees/mutations.ts`**

```typescript
// Before:
import { employeesApi, CreateEmployeeData, UpdateEmployeeData } from "@/lib/api";
// After:
import { employeesApi } from "./api";
import type { CreateEmployeeData, UpdateEmployeeData } from "./api";
```

- [ ] **Step 5: Extract EmployeeList component**

Create `client/features/employees/components/EmployeeList.tsx`. Cut the entire component body from `app/dashboard/employees/page.tsx` and paste it here. Update imports:

```typescript
// In EmployeeList.tsx, update:
import AddEmployeeDialog from './AddEmployeeDialog';          // sibling
import { useEmployeesQuery } from '../queries';               // feature-local
import { useDeactivateEmployeeMutation } from '../mutations'; // feature-local
// all @/components/ui/ and @/components/common/ imports remain unchanged
```

Then replace `app/dashboard/employees/page.tsx` with:
```typescript
import { EmployeeList } from '@/features/employees';
export default function EmployeesPage() {
  return <EmployeeList />;
}
```

- [ ] **Step 6: Extract EmployeeDetail component**

Read `app/dashboard/employees/[id]/page.tsx`. Create `client/features/employees/components/EmployeeDetail.tsx` with the full component body. Update imports:

```typescript
import { useEmployeeByIdQuery } from '../queries';
import { useUpdateEmployeeMutation, useDeactivateEmployeeMutation } from '../mutations';
```

Then replace `app/dashboard/employees/[id]/page.tsx`:
```typescript
import { EmployeeDetail } from '@/features/employees';
export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  return <EmployeeDetail id={params.id} />;
}
```

> Note: The EmployeeDetail component must accept an `id` prop instead of reading `useParams()` from the router, since the page passes it via props.

- [ ] **Step 7: Create `client/features/employees/types.ts`**

```typescript
export interface EmployeeRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  roleTemplate: string;
  scopeType: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export const ROLE_LABELS: Record<string, string> = {
  org_manager: 'Org Manager',
  zone_manager: 'Zone Manager',
  store_manager: 'Store Manager',
  surveyor: 'Surveyor',
};
```

- [ ] **Step 8: Create `client/features/employees/index.ts`**

```typescript
export { default as EmployeeList } from './components/EmployeeList';
export { default as EmployeeDetail } from './components/EmployeeDetail';
export { default as AddEmployeeDialog } from './components/AddEmployeeDialog';
export { useEmployeesQuery, useEmployeeByIdQuery } from './queries';
export {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeactivateEmployeeMutation,
  useReactivateEmployeeMutation,
  useAssignStoreManagerMutation,
} from './mutations';
export type { EmployeeRow } from './types';
```

- [ ] **Step 9: Create `client/features/employees/employees_agent.md`**

```markdown
# Employees Feature

## 1. Overview
Manages employee lifecycle UI within an org: paginated list with search/filter, employee detail view,
and invite dialog. Enforces role hierarchy display (org_manager > zone_manager > store_manager > surveyor).
All data operations go through TanStack Query hooks backed by the `/api/v1/employees` REST endpoints.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Raw Axios calls for employee CRUD (list, getById, create, update, deactivate, reactivate, assignStoreManager) |
| queries.ts | useEmployeesQuery (paginated list), useEmployeeByIdQuery |
| mutations.ts | useCreateEmployeeMutation, useUpdateEmployeeMutation, useDeactivateEmployeeMutation, useReactivateEmployeeMutation, useAssignStoreManagerMutation |
| types.ts | EmployeeRow interface, ROLE_LABELS map |
| components/EmployeeList.tsx | Full paginated employee table with search, role filter, status filter, per-page |
| components/EmployeeDetail.tsx | Employee detail view with permissions and scopes |
| components/AddEmployeeDialog.tsx | Invite new employee modal (role + scope selection) |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `EmployeeList`, `EmployeeDetail`, `AddEmployeeDialog`, `useEmployeesQuery`, `useEmployeeByIdQuery`, `useCreateEmployeeMutation`, `useDeactivateEmployeeMutation`

## 4. Core Rules & Edge Cases
- `ROLE_LABELS` drives all role display strings — do not hardcode role names in components
- EmployeeDetail accepts `id` as a prop (not from useParams) — page passes it from URL params
- Deactivation is optimistic-UI with cache invalidation; reactivation follows the same pattern
- Search is debounced 400ms to avoid excessive API calls
- `useAssignStoreManagerMutation` calls `/stores/:storeId/manager` (cross-domain endpoint)
```

- [ ] **Step 10: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors for employee-related files.

- [ ] **Step 11: Commit**

```bash
git add features/employees/ app/dashboard/employees/
git commit -m "refactor(client): extract employees feature"
```

---

## Task 5: stores feature

**Files:**
- Create: `client/features/stores/stores_agent.md`
- Create: `client/features/stores/api.ts` ← from `lib/api/stores.api.ts`
- Create: `client/features/stores/queries.ts` ← from `hooks/queries/useStoreQueries.ts`
- Create: `client/features/stores/mutations.ts` ← from `hooks/mutations/useStoreMutations.ts`
- Create: `client/features/stores/types.ts`
- Move all files from: `client/app/dashboard/stores/components/` → `client/features/stores/components/`
- Create: `client/features/stores/components/StoreList.tsx` ← extracted from `app/dashboard/stores/page.tsx`
- Create: `client/features/stores/components/StoreDetail.tsx` ← extracted from `app/dashboard/stores/[id]/page.tsx`
- Create: `client/features/stores/index.ts`
- Modify: `client/app/dashboard/stores/page.tsx` → thin wrapper
- Modify: `client/app/dashboard/stores/[id]/page.tsx` → thin wrapper

- [ ] **Step 1: Move API, query, mutation files and existing components**

```bash
git mv lib/api/stores.api.ts features/stores/api.ts
git mv hooks/queries/useStoreQueries.ts features/stores/queries.ts
git mv hooks/mutations/useStoreMutations.ts features/stores/mutations.ts
git mv app/dashboard/stores/components/AddStoreDialog.tsx features/stores/components/AddStoreDialog.tsx
git mv app/dashboard/stores/components/BulkImportDialog.tsx features/stores/components/BulkImportDialog.tsx
git mv app/dashboard/stores/components/EditStoreDialog.tsx features/stores/components/EditStoreDialog.tsx
git mv app/dashboard/stores/components/MapView.tsx features/stores/components/MapView.tsx
git mv app/dashboard/stores/components/StoreScheduleTab.tsx features/stores/components/StoreScheduleTab.tsx
git mv app/dashboard/stores/components/StoreSurveysTab.tsx features/stores/components/StoreSurveysTab.tsx
```

- [ ] **Step 2: Update imports in `features/stores/api.ts`**

```typescript
import apiClient from '@/lib/api/client';
```

- [ ] **Step 3: Update imports in `features/stores/queries.ts` and `mutations.ts`**

```typescript
// queries.ts — Before:
import { storesApi, StoreListParams } from "@/lib/api";
// After:
import { storesApi } from "./api";
import type { StoreListParams } from "./api";

// mutations.ts — Before:
import { storesApi, CreateStoreData, BulkImportResponse } from "@/lib/api";
// After:
import { storesApi } from "./api";
import type { CreateStoreData, BulkImportResponse } from "./api";
```

- [ ] **Step 4: Update imports in moved component files**

For each moved component (`AddStoreDialog.tsx`, `EditStoreDialog.tsx`, `BulkImportDialog.tsx`, `StoreScheduleTab.tsx`, `StoreSurveysTab.tsx`):

Open each file and change any `@/lib/api` imports to `../api`, any `@/hooks/queries/useStoreQueries` to `../queries`, any `@/hooks/mutations/useStoreMutations` to `../mutations`.

- [ ] **Step 5: Extract StoreList and StoreDetail from page files**

Create `features/stores/components/StoreList.tsx` — cut from `app/dashboard/stores/page.tsx`.
Create `features/stores/components/StoreDetail.tsx` — cut from `app/dashboard/stores/[id]/page.tsx`.

Update `app/dashboard/stores/page.tsx`:
```typescript
import { StoreList } from '@/features/stores';
export default function StoresPage() { return <StoreList />; }
```

Update `app/dashboard/stores/[id]/page.tsx`:
```typescript
import { StoreDetail } from '@/features/stores';
export default function StoreDetailPage({ params }: { params: { id: string } }) {
  return <StoreDetail id={params.id} />;
}
```

- [ ] **Step 6: Create `client/features/stores/index.ts`**

```typescript
export { default as StoreList } from './components/StoreList';
export { default as StoreDetail } from './components/StoreDetail';
export { default as AddStoreDialog } from './components/AddStoreDialog';
export { default as BulkImportDialog } from './components/BulkImportDialog';
export { default as EditStoreDialog } from './components/EditStoreDialog';
export { default as MapView } from './components/MapView';
export { useStoresQuery, useStoreByIdQuery } from './queries';
export { useCreateStoreMutation, useUpdateStoreMutation, useBulkImportStoresMutation } from './mutations';
```

- [ ] **Step 7: Create `client/features/stores/stores_agent.md`**

```markdown
# Stores Feature

## 1. Overview
Manages retail store UI: paginated list with map view toggle, store detail with schedule and survey tabs,
add/edit dialogs, and CSV bulk import. Stores are the primary operational unit; schedules and surveys
attach to stores.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: list, getById, create, update, delete, bulkImport |
| queries.ts | useStoresQuery, useStoreByIdQuery |
| mutations.ts | useCreateStoreMutation, useUpdateStoreMutation, useBulkImportStoresMutation |
| types.ts | StoreRow, StoreDetail interfaces |
| components/StoreList.tsx | Paginated store table with list/map toggle |
| components/StoreDetail.tsx | Store detail with schedule + survey tabs |
| components/MapView.tsx | Google Maps view of stores |
| components/AddStoreDialog.tsx | Create store modal |
| components/EditStoreDialog.tsx | Edit store modal |
| components/BulkImportDialog.tsx | CSV import with row-level error display |
| components/StoreScheduleTab.tsx | Store's schedule slots tab |
| components/StoreSurveysTab.tsx | Store's survey history tab |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `StoreList`, `StoreDetail`, `AddStoreDialog`, `BulkImportDialog`, `EditStoreDialog`, `MapView`, `useStoresQuery`, `useStoreByIdQuery`, `useCreateStoreMutation`, `useBulkImportStoresMutation`

## 4. Core Rules & Edge Cases
- StoreDetail accepts `id` prop; page passes it from URL params
- BulkImport returns per-row errors — display them without stopping the overall import
- MapView requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var; shows placeholder if missing
- StoreScheduleTab and StoreSurveysTab use schedule and survey feature queries respectively — import via `@/features/schedule` and `@/features/surveys`
- Scope filtering is handled server-side; client does not filter stores list
```

- [ ] **Step 8: Commit**

```bash
git add features/stores/ app/dashboard/stores/
git commit -m "refactor(client): extract stores feature"
```

---

## Task 6: zones feature

**Files:**
- Create: `client/features/zones/zones_agent.md`
- Create: `client/features/zones/api.ts` ← from `lib/api/zones.api.ts`
- Create: `client/features/zones/queries.ts` ← from `hooks/queries/useZoneQueries.ts`
- Create: `client/features/zones/mutations.ts` ← from `hooks/mutations/useZoneMutations.ts`
- Create: `client/features/zones/types.ts`
- Move: `client/app/dashboard/stores/zones/components/` → `client/features/zones/components/`
- Create: `client/features/zones/components/ZoneList.tsx` ← extracted from `app/dashboard/stores/zones/page.tsx`
- Create: `client/features/zones/index.ts`
- Modify: `client/app/dashboard/stores/zones/page.tsx` → thin wrapper

- [ ] **Step 1: Move files**

```bash
git mv lib/api/zones.api.ts features/zones/api.ts
git mv hooks/queries/useZoneQueries.ts features/zones/queries.ts
git mv hooks/mutations/useZoneMutations.ts features/zones/mutations.ts
git mv app/dashboard/stores/zones/components/AddZoneDialog.tsx features/zones/components/AddZoneDialog.tsx
git mv app/dashboard/stores/zones/components/EditZoneDialog.tsx features/zones/components/EditZoneDialog.tsx
```

- [ ] **Step 2: Update imports in moved files**

In `api.ts`: change `import apiClient from './client'` → `import apiClient from '@/lib/api/client'`

In `queries.ts`:
```typescript
import { zonesApi } from "./api";
import type { ZoneListParams } from "./api";
```

In `mutations.ts`:
```typescript
import { zonesApi } from "./api";
import type { CreateZoneData, Zone } from "./api";
```

In dialog components: change any `@/lib/api` → `../api`, any `@/hooks/*` → sibling hooks.

- [ ] **Step 3: Extract ZoneList from page**

Create `features/zones/components/ZoneList.tsx` — cut from `app/dashboard/stores/zones/page.tsx`.

Replace `app/dashboard/stores/zones/page.tsx`:
```typescript
import { ZoneList } from '@/features/zones';
export default function ZonesPage() { return <ZoneList />; }
```

- [ ] **Step 4: Create `client/features/zones/index.ts`**

```typescript
export { default as ZoneList } from './components/ZoneList';
export { default as AddZoneDialog } from './components/AddZoneDialog';
export { default as EditZoneDialog } from './components/EditZoneDialog';
export { useZonesQuery } from './queries';
export { useCreateZoneMutation, useUpdateZoneMutation, useDeleteZoneMutation } from './mutations';
```

- [ ] **Step 5: Create `client/features/zones/zones_agent.md`**

```markdown
# Zones Feature

## 1. Overview
Manages geographic zone hierarchy UI within an org. Zones sit between orgs and stores;
zone managers have data access limited to their assigned zones. The zones page lives under
the stores section in the dashboard (`/dashboard/stores/zones`).

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: list, create, update, delete |
| queries.ts | useZonesQuery |
| mutations.ts | useCreateZoneMutation, useUpdateZoneMutation, useDeleteZoneMutation |
| types.ts | Zone interface |
| components/ZoneList.tsx | Zone table with add/edit/delete actions |
| components/AddZoneDialog.tsx | Create zone modal |
| components/EditZoneDialog.tsx | Edit zone modal |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `ZoneList`, `AddZoneDialog`, `EditZoneDialog`, `useZonesQuery`, `useCreateZoneMutation`

## 4. Core Rules & Edge Cases
- Zones are org-scoped; orgId comes from the auth context, not from user input
- Zone name must be unique within an org (enforced server-side; surface error to user)
- Deleting a zone with assigned stores shows a warning
```

- [ ] **Step 6: Commit**

```bash
git add features/zones/ app/dashboard/stores/zones/
git commit -m "refactor(client): extract zones feature"
```

---

## Task 7: schedule feature

**Files:**
- Create: `client/features/schedule/schedule_agent.md`
- Create: `client/features/schedule/api.ts` ← from `lib/api/schedule.api.ts`
- Create: `client/features/schedule/queries.ts` ← from `hooks/queries/useScheduleQueries.ts`
- Create: `client/features/schedule/mutations.ts` ← from `hooks/mutations/useScheduleMutations.ts`
- Create: `client/features/schedule/types.ts`
- Move all from: `client/components/schedule/` → `client/features/schedule/components/`
- Create: `client/features/schedule/components/ScheduleView.tsx` ← extracted from `app/dashboard/schedule/page.tsx`
- Create: `client/features/schedule/index.ts`
- Modify: `client/app/dashboard/schedule/page.tsx` → thin wrapper

- [ ] **Step 1: Move files**

```bash
git mv lib/api/schedule.api.ts features/schedule/api.ts
git mv hooks/queries/useScheduleQueries.ts features/schedule/queries.ts
git mv hooks/mutations/useScheduleMutations.ts features/schedule/mutations.ts
git mv components/schedule/ScheduleCalendar.tsx features/schedule/components/ScheduleCalendar.tsx
git mv components/schedule/TemplateBuilderDialog.tsx features/schedule/components/TemplateBuilderDialog.tsx
git mv components/schedule/TemplateCard.tsx features/schedule/components/TemplateCard.tsx
git mv components/schedule/AssignmentsTab.tsx features/schedule/components/AssignmentsTab.tsx
git mv components/schedule/AssignSurveyorDialog.tsx features/schedule/components/AssignSurveyorDialog.tsx
git mv components/schedule/DayDetailDialog.tsx features/schedule/components/DayDetailDialog.tsx
```

- [ ] **Step 2: Update imports in `api.ts`, `queries.ts`, `mutations.ts`**

In `api.ts`: `import apiClient from '@/lib/api/client'`

In `queries.ts`:
```typescript
import { scheduleApi } from "./api";
import type { ScheduleTemplate, ScheduleSlot, /* all other types */ } from "./api";
```

In `mutations.ts`:
```typescript
import { scheduleApi } from "./api";
```

- [ ] **Step 3: Update imports in moved schedule components**

For each component in `features/schedule/components/`, open the file and change any `@/lib/api` imports to `../api`, any `@/hooks/queries/useScheduleQueries` to `../queries`, any `@/hooks/mutations/useScheduleMutations` to `../mutations`.

- [ ] **Step 4: Extract ScheduleView from page**

Create `features/schedule/components/ScheduleView.tsx` — cut from `app/dashboard/schedule/page.tsx`.

Replace `app/dashboard/schedule/page.tsx`:
```typescript
import { ScheduleView } from '@/features/schedule';
export default function SchedulePage() { return <ScheduleView />; }
```

- [ ] **Step 5: Create `client/features/schedule/index.ts`**

```typescript
export { default as ScheduleView } from './components/ScheduleView';
export { default as ScheduleCalendar } from './components/ScheduleCalendar';
export { default as TemplateBuilderDialog } from './components/TemplateBuilderDialog';
export { default as TemplateCard } from './components/TemplateCard';
export { default as AssignmentsTab } from './components/AssignmentsTab';
export { default as AssignSurveyorDialog } from './components/AssignSurveyorDialog';
export { default as DayDetailDialog } from './components/DayDetailDialog';
export { useScheduleTemplatesQuery, useScheduleSlotsQuery } from './queries';
export { useCreateTemplateMutation, useAssignSurveyorMutation } from './mutations';
export type { ScheduleTemplate, ScheduleSlot, SlotStatus } from './api';
```

- [ ] **Step 6: Create `client/features/schedule/schedule_agent.md`**

```markdown
# Schedule Feature

## 1. Overview
Manages scheduling UI: template builder, calendar view of materialized slots, and surveyor assignment.
This is the most complex client feature. Templates define recurring schedule patterns; the server
materializes them into concrete slots that can be assigned to surveyors.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls for templates, rules, windows, slots, assignments, preview |
| queries.ts | useScheduleTemplatesQuery, useScheduleSlotsQuery, useSchedulePreviewQuery |
| mutations.ts | useCreateTemplateMutation, useUpdateTemplateMutation, useAssignSurveyorMutation, etc. |
| types.ts | ScheduleTemplate, RecurrenceRule, TimeWindow, ScheduleSlot local UI types |
| components/ScheduleView.tsx | Main schedule page — template list + calendar |
| components/ScheduleCalendar.tsx | Calendar grid rendering materialized slots |
| components/TemplateBuilderDialog.tsx | Multi-step template creation wizard |
| components/TemplateCard.tsx | Template preview with rule summary |
| components/AssignmentsTab.tsx | Surveyor assignment management |
| components/AssignSurveyorDialog.tsx | Assign surveyor to specific slot |
| components/DayDetailDialog.tsx | Detail view for a single calendar day |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `ScheduleView`, `ScheduleCalendar`, `TemplateBuilderDialog`, `useScheduleTemplatesQuery`, `useScheduleSlotsQuery`, `useCreateTemplateMutation`, `useAssignSurveyorMutation`

## 4. Core Rules & Edge Cases
- Slot queries MUST always include a date range (server-side partitioned table)
- Template builder is a controlled multi-step form; don't persist intermediate steps to server
- `previewSlots` is a read-only dry-run call — use before creating final template
- Slot status: `scheduled` → `in_progress` → `completed` / `missed`
- Calendar shows 1 month at a time; fetching is triggered on month navigation
```

- [ ] **Step 7: Commit**

```bash
git add features/schedule/ app/dashboard/schedule/ components/schedule/
git commit -m "refactor(client): extract schedule feature, move from components/schedule/"
```

---

## Task 8: surveys feature

**Files:**
- Create: `client/features/surveys/surveys_agent.md`
- Create: `client/features/surveys/api.ts` ← from `lib/api/surveys.api.ts`
- Create: `client/features/surveys/queries.ts` ← from `hooks/queries/useSurveyQueries.ts`
- Create: `client/features/surveys/mutations.ts`
- Create: `client/features/surveys/types.ts`
- Create: `client/features/surveys/components/SurveyList.tsx` ← extracted from `app/dashboard/surveys/page.tsx`
- Create: `client/features/surveys/components/SurveyDetail.tsx` ← extracted from `app/dashboard/surveys/[id]/page.tsx`
- Create: `client/features/surveys/index.ts`
- Modify: `client/app/dashboard/surveys/page.tsx` → thin wrapper
- Modify: `client/app/dashboard/surveys/[id]/page.tsx` → thin wrapper

- [ ] **Step 1: Move files**

```bash
git mv lib/api/surveys.api.ts features/surveys/api.ts
git mv hooks/queries/useSurveyQueries.ts features/surveys/queries.ts
```

Update `api.ts`: `import apiClient from '@/lib/api/client'`

Update `queries.ts`:
```typescript
import { surveysApi } from "./api";
import type { Survey, SurveyDetail, SurveyPhoto } from "./api";
```

- [ ] **Step 2: Create `features/surveys/mutations.ts`**

If there are no existing survey mutations, create an empty placeholder:
```typescript
'use client';
// Survey mutations (status updates, etc.) — add as needed
export {};
```

If `hooks/mutations/useSurveyMutations.ts` exists: `git mv` it and update imports.

- [ ] **Step 3: Extract SurveyList and SurveyDetail**

Create `features/surveys/components/SurveyList.tsx` — cut from `app/dashboard/surveys/page.tsx`.
Create `features/surveys/components/SurveyDetail.tsx` — cut from `app/dashboard/surveys/[id]/page.tsx`.

Update pages:
```typescript
// app/dashboard/surveys/page.tsx
import { SurveyList } from '@/features/surveys';
export default function SurveysPage() { return <SurveyList />; }

// app/dashboard/surveys/[id]/page.tsx
import { SurveyDetail } from '@/features/surveys';
export default function SurveyDetailPage({ params }: { params: { id: string } }) {
  return <SurveyDetail id={params.id} />;
}
```

- [ ] **Step 4: Create `client/features/surveys/index.ts`**

```typescript
export { default as SurveyList } from './components/SurveyList';
export { default as SurveyDetail } from './components/SurveyDetail';
export { useSurveysQuery, useSurveyByIdQuery } from './queries';
export type { Survey, SurveyDetail as SurveyDetailType, SurveyPhoto } from './api';
```

- [ ] **Step 5: Create `client/features/surveys/surveys_agent.md`**

```markdown
# Surveys Feature

## 1. Overview
Displays survey instances and their associated photos. Surveys represent completed or in-progress
store visits. The UI is read-heavy: survey list with status filtering and a detail view with
scene-by-scene photo browsing. Write operations (submitting survey data) happen from the mobile
app, not this dashboard.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: list, getById, listPhotos |
| queries.ts | useSurveysQuery, useSurveyByIdQuery |
| mutations.ts | Placeholder (survey mutations are primarily mobile-side) |
| types.ts | Survey, SurveyScene, SurveyPhoto local interfaces |
| components/SurveyList.tsx | Paginated survey list with status and date filters |
| components/SurveyDetail.tsx | Survey detail with scene tabs and photo grid |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `SurveyList`, `SurveyDetail`, `useSurveysQuery`, `useSurveyByIdQuery`

## 4. Core Rules & Edge Cases
- SurveyDetail accepts `id` as prop
- Survey status: `pending` → `in_progress` → `completed`
- Photos are S3 URLs — display directly; do not proxy
- Survey queries must include a date range (server-side partitioned tables)
```

- [ ] **Step 6: Commit**

```bash
git add features/surveys/ app/dashboard/surveys/
git commit -m "refactor(client): extract surveys feature"
```

---

## Task 9: settings feature

**Files:**
- Create: `client/features/settings/settings_agent.md`
- Create: `client/features/settings/api.ts` ← from `lib/api/org.api.ts`
- Create: `client/features/settings/queries.ts` ← from `hooks/queries/useOrgQueries.ts`
- Create: `client/features/settings/mutations.ts` ← from `hooks/mutations/useOrgMutations.ts`
- Create: `client/features/settings/types.ts`
- Create: `client/features/settings/components/OrgSettings.tsx` ← extracted from `app/dashboard/settings/page.tsx`
- Create: `client/features/settings/index.ts`
- Modify: `client/app/dashboard/settings/page.tsx` → thin wrapper
- Modify: `client/features/onboarding/mutations.ts` → update org API import (if it was deferred from Task 3)

- [ ] **Step 1: Move files**

```bash
git mv lib/api/org.api.ts features/settings/api.ts
git mv hooks/queries/useOrgQueries.ts features/settings/queries.ts
git mv hooks/mutations/useOrgMutations.ts features/settings/mutations.ts
```

Update `api.ts`: `import apiClient from '@/lib/api/client'`

Update `queries.ts`:
```typescript
import { orgApi } from "./api";
```

Update `mutations.ts`:
```typescript
import { orgApi } from "./api";
```

- [ ] **Step 2: Update onboarding mutations import (deferred from Task 3)**

In `features/onboarding/mutations.ts`, change the temporary `@/lib/api` import to the now-available settings feature:

```typescript
// Before (temporary from Task 3):
import { orgApi } from '@/lib/api';
// After:
import { orgApi } from '@/features/settings/api';
```

- [ ] **Step 3: Extract OrgSettings component**

Create `features/settings/components/OrgSettings.tsx` — cut from `app/dashboard/settings/page.tsx`.

Replace `app/dashboard/settings/page.tsx`:
```typescript
import { OrgSettings } from '@/features/settings';
export default function SettingsPage() { return <OrgSettings />; }
```

- [ ] **Step 4: Create `client/features/settings/index.ts`**

```typescript
export { default as OrgSettings } from './components/OrgSettings';
export { useOrgQuery } from './queries';
export { useUpdateOrgMutation } from './mutations';
export { orgApi } from './api';
```

- [ ] **Step 5: Create `client/features/settings/settings_agent.md`**

```markdown
# Settings Feature

## 1. Overview
Manages organization settings UI: name, industry, address, logo, and feature modules.
This feature also owns the raw `orgApi` which is consumed by the onboarding feature for
org registration. Settings changes take effect immediately after save.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: getMe, update, getSettings; also used by onboarding |
| queries.ts | useOrgQuery |
| mutations.ts | useUpdateOrgMutation |
| types.ts | OrgProfile, OrgSettings interfaces |
| components/OrgSettings.tsx | Settings form: org name, industry, address, contact |
| index.ts | Public exports including `orgApi` for cross-feature use |

## 3. Public Contract
**Exports:** `OrgSettings`, `useOrgQuery`, `useUpdateOrgMutation`, `orgApi`
**Cross-feature consumers:** `features/onboarding` imports `orgApi` from this feature

## 4. Core Rules & Edge Cases
- `orgApi` is exported from index.ts because onboarding feature needs `orgApi.register()`
- Org industry and name cannot be changed after approval (enforce on server; surface error on client)
- Settings page is only accessible to users with `org:write` permission
```

- [ ] **Step 6: Commit**

```bash
git add features/settings/ app/dashboard/settings/ features/onboarding/mutations.ts
git commit -m "refactor(client): extract settings feature, update onboarding org import"
```

---

## Task 10: lookups feature

**Files:**
- Create: `client/features/lookups/lookups_agent.md`
- Create: `client/features/lookups/api.ts` ← from `lib/api/lookups.api.ts`
- Create: `client/features/lookups/queries.ts` ← from `hooks/queries/useLookupQueries.ts`
- Create: `client/features/lookups/types.ts`
- Create: `client/features/lookups/index.ts`

- [ ] **Step 1: Move files**

```bash
git mv lib/api/lookups.api.ts features/lookups/api.ts
git mv hooks/queries/useLookupQueries.ts features/lookups/queries.ts
```

Update `api.ts`: `import apiClient from '@/lib/api/client'`

Update `queries.ts`:
```typescript
import { lookupsApi } from "./api";
```

- [ ] **Step 2: Create `client/features/lookups/index.ts`**

```typescript
export { useIndustriesQuery, useStoreCategoriesQuery } from './queries';
export { lookupsApi } from './api';
```

- [ ] **Step 3: Create `client/features/lookups/lookups_agent.md`**

```markdown
# Lookups Feature

## 1. Overview
Provides read-only reference data for dropdown/select components across the app:
industry types and store categories. These are seeded data that rarely change.
No write operations. Used by onboarding (industry selection) and store management (store category).

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls: getIndustries, getStoreCategories |
| queries.ts | useIndustriesQuery, useStoreCategoriesQuery |
| types.ts | Industry, StoreCategory interfaces |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `useIndustriesQuery`, `useStoreCategoriesQuery`, `lookupsApi`

## 4. Core Rules & Edge Cases
- Set `staleTime: Infinity` on lookup queries — this data never changes without a deployment
- Used in: onboarding industry select, store add/edit dialogs
- No mutations — all writes are via `db:seed` on the server side
```

- [ ] **Step 4: Commit**

```bash
git add features/lookups/
git commit -m "refactor(client): extract lookups feature"
```

---

## Task 11: tours feature (API-only)

**Files:**
- Create: `client/features/tours/tours_agent.md`
- Create: `client/features/tours/api.ts` ← from `lib/api/tours.api.ts`
- Create: `client/features/tours/types.ts`
- Create: `client/features/tours/index.ts`

- [ ] **Step 1: Move files**

```bash
git mv lib/api/tours.api.ts features/tours/api.ts
```

Update `api.ts`: `import apiClient from '@/lib/api/client'`

- [ ] **Step 2: Create `client/features/tours/index.ts`**

```typescript
export { toursApi } from './api';
export type { Tour, TourScene, TourShelf } from './api';
```

- [ ] **Step 3: Create `client/features/tours/tours_agent.md`**

```markdown
# Tours Feature

## 1. Overview
API client layer for 360° virtual tour management. No dedicated tour pages exist in this
dashboard yet — tours are accessed from the store detail view. This feature holds the API
functions and types for when tour UI is built out.

## 2. File Map
| File | Responsibility |
|------|---------------|
| api.ts | Axios calls for tour CRUD, scene management, shelf markers |
| types.ts | Tour, TourScene, TourShelf interfaces |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** `toursApi`, `Tour`, `TourScene`, `TourShelf` types

## 4. Core Rules & Edge Cases
- One tour per store (enforced server-side)
- Tour data is synced from an external 360° capture pipeline via `PUT /tours/:id/sync`
- UI components for tour browsing will live here when built (currently in store detail tab if any)
```

- [ ] **Step 4: Commit**

```bash
git add features/tours/
git commit -m "refactor(client): extract tours feature (API-only)"
```

---

## Task 12: Final cleanup — delete old directories and verify

**Files:**
- Delete: `client/hooks/queries/` (should be empty)
- Delete: `client/hooks/mutations/` (should be empty)
- Delete: `client/lib/api/*.api.ts` (all moved to features)
- Delete: `client/lib/api/index.ts`
- Delete: `client/components/schedule/` (moved to features/schedule/)
- Delete: `client/app/dashboard/stores/components/` (moved to features/stores/)
- Delete: `client/app/dashboard/employees/components/` (moved to features/employees/)

- [ ] **Step 1: Verify all hooks/ and lib/api/ files have been moved**

```bash
ls hooks/queries/
ls hooks/mutations/
ls lib/api/
```

Expected: `hooks/queries/` and `hooks/mutations/` contain only `useAuth.ts` (if it's there) or are empty. `lib/api/` should contain only `client.ts`. All `*.api.ts` files should be gone.

- [ ] **Step 2: Find any remaining imports from old paths**

```bash
grep -r "from '@/lib/api'" --include="*.ts" --include="*.tsx" . | grep -v "from '@/lib/api/client'"
grep -r "from '@/hooks/queries/" --include="*.ts" --include="*.tsx" .
grep -r "from '@/hooks/mutations/" --include="*.ts" --include="*.tsx" .
```

Expected: zero results. If any remain, trace each file and update the import to use the feature path.

- [ ] **Step 3: Delete old directories**

```bash
git rm -r hooks/queries hooks/mutations lib/api/index.ts
# Remove individual *.api.ts files if any remain:
# git rm lib/api/auth.api.ts lib/api/org.api.ts etc. (should already be gone via git mv)
```

If `hooks/useAuth.ts` exists, leave `hooks/` in place (just remove `queries/` and `mutations/` subdirs).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Common issues to check:
- Any component still importing from `@/lib/api` (not `/client`) → update to import from the relevant feature
- Any type mismatch from renamed files → verify types are exported from feature `index.ts`

- [ ] **Step 5: Start dev server and verify**

```bash
npm run dev
```

Expected: app starts on port 3001 with no compilation errors. Navigate through:
- Dashboard → Employees (list loads, add dialog opens)
- Dashboard → Stores (list loads, map toggle works)
- Dashboard → Schedule (templates and calendar render)
- Dashboard → Surveys (list loads)
- Dashboard → Settings (org form loads)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "refactor(client): delete old hooks/ and lib/api/ directories after feature migration

All TanStack Query hooks and API functions are now co-located within their feature modules
under features/. The hooks/queries/, hooks/mutations/, and lib/api/*.api.ts files are removed.
lib/api/client.ts (Axios singleton) is the only remaining shared API utility."
```

---

## Self-Review Checklist

- [x] All 10 client domains have a feature: auth, onboarding, employees, stores, zones, schedule, surveys, settings, lookups, tours
- [x] `components/schedule/` moved to `features/schedule/components/` (Task 7)
- [x] All `app/dashboard/*/components/` dialog files moved to their feature (Tasks 4, 5, 6)
- [x] All page.tsx files are thin wrappers importing from features/
- [x] Cross-feature dependency: `onboarding/mutations.ts` → `settings/api.ts` (Task 9 Step 2)
- [x] `lib/api/client.ts` stays as shared Axios singleton
- [x] `contexts/auth-context.tsx` and `hooks/useAuth.ts` are unchanged (global)
- [x] All `*.api.ts` imports updated from `'./client'` to `'@/lib/api/client'`
- [x] All query/mutation files updated from `'@/lib/api'` to `'./api'`
- [x] Every feature has `_agent.md` with all 4 required sections
- [x] Final TypeScript check and dev server verification in Task 12
