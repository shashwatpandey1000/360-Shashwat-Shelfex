# Modular Refactor — Design Spec
**Date:** 2026-05-25  
**Branch:** `modular`  
**Status:** Approved

---

## 1. Goal

Reorganize the ShelfEx 360 monorepo from a flat, technical-layer structure (routes/, controllers/, services/, hooks/, lib/api/) into isolated domain modules. Each module is fully self-contained and self-documenting so that any developer or AI agent can understand a domain by opening one folder.

---

## 2. Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client data layer | TanStack Query (mutations.ts / queries.ts) | REST API backend on separate Express server; Server Actions add no value here |
| Server repository layer | None — services call Drizzle directly | Simpler; ORM is stable; repository abstraction is premature for this team |
| Refactor scope | Both client and server, all domains at once | Avoids half-migrated state on the branch |
| Client layout | Flat — `features/` alongside `app/` (no src/) | Avoids path-alias churn; functionally identical |
| Approach | Option A — full encapsulation | lib/api/ and hooks/ directories fully emptied into features |

---

## 3. Server Target Structure

```
server/src/
├── app.ts                     # mounts routers from modules/ (import paths change only)
├── server.ts                  # unchanged
│
├── shared/                    # Cross-cutting — not owned by any single domain
│   ├── db/
│   │   ├── index.ts           # Drizzle + Neon driver instance
│   │   ├── baseline.ts
│   │   ├── migrate.ts
│   │   ├── seed.ts
│   │   └── schema/            # All Drizzle table definitions
│   │       ├── index.ts
│   │       ├── users.ts
│   │       ├── organizations.ts
│   │       ├── stores.ts
│   │       ├── schedule.ts
│   │       ├── surveys.ts
│   │       ├── tours.ts
│   │       ├── forms.ts
│   │       ├── lookups.ts
│   │       └── notifications.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── permission.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   ├── superAdmin.middleware.ts
│   │   ├── tenant.middleware.ts
│   │   └── validate.middleware.ts
│   ├── utils/
│   │   ├── ApiResponse.ts
│   │   ├── asyncHandler.ts
│   │   ├── logger.ts
│   │   ├── permissions.ts
│   │   └── validateEnv.ts
│   ├── services/
│   │   ├── email.service.ts       # Cross-domain (used by employee invitation, org approval)
│   │   └── accessMap.service.ts   # Cross-domain (used by auth middleware for all routes)
│   └── jobs/
│       └── retryPendingApprovalEmails.ts
│
└── modules/
    ├── health/
    │   ├── health.routes.ts
    │   ├── health.controller.ts
    │   └── index.ts
    │
    ├── auth/
    │   ├── auth_agent.md
    │   ├── auth.routes.ts
    │   ├── auth.controller.ts
    │   ├── auth.types.ts          # from validations/auth.validation.ts
    │   └── index.ts
    │
    ├── org/
    │   ├── org_agent.md
    │   ├── org.routes.ts
    │   ├── org.controller.ts
    │   ├── org.service.ts
    │   ├── org.types.ts           # from validations/org.validation.ts + settings.validation.ts
    │   └── index.ts
    │
    ├── employee/
    │   ├── employee_agent.md
    │   ├── employee.routes.ts
    │   ├── employee.controller.ts
    │   ├── employee.service.ts
    │   ├── employee.types.ts      # from validations/employee.validation.ts
    │   └── index.ts
    │
    ├── store/
    │   ├── store_agent.md
    │   ├── store.routes.ts
    │   ├── store.controller.ts
    │   ├── store.service.ts
    │   ├── store.types.ts         # from validations/store.validation.ts
    │   └── index.ts
    │
    ├── zone/
    │   ├── zone_agent.md
    │   ├── zone.routes.ts
    │   ├── zone.controller.ts
    │   ├── zone.service.ts
    │   ├── zone.types.ts          # from validations/zone.validation.ts
    │   └── index.ts
    │
    ├── schedule/
    │   ├── schedule_agent.md
    │   ├── schedule.routes.ts
    │   ├── schedule.controller.ts
    │   ├── schedule.service.ts
    │   ├── schedule.materializer.ts  # slot generation engine — stays in module
    │   ├── schedule.types.ts      # from validations/schedule.validation.ts
    │   └── index.ts
    │
    ├── survey/
    │   ├── survey_agent.md
    │   ├── survey.routes.ts
    │   ├── survey.controller.ts
    │   ├── survey.service.ts
    │   ├── survey.types.ts        # from validations/survey.validation.ts
    │   └── index.ts
    │
    ├── tour/
    │   ├── tour_agent.md
    │   ├── tour.routes.ts
    │   ├── tour.controller.ts
    │   ├── tour.service.ts
    │   ├── tour.types.ts          # from validations/tour.validation.ts
    │   └── index.ts
    │
    ├── lookups/
    │   ├── lookups_agent.md
    │   ├── lookups.routes.ts
    │   ├── lookups.controller.ts
    │   ├── lookups.types.ts
    │   └── index.ts
    │
    └── admin/
        ├── admin_agent.md
        ├── admin.routes.ts
        ├── admin.controller.ts
        ├── admin.types.ts
        └── index.ts
```

### Server Module File Conventions

**`[module].types.ts`** — Zod schemas + inferred TS types. Replaces the old `validations/[module].validation.ts`. All Zod schemas and `z.infer<>` types live here.

**`[module].routes.ts`** — Route definitions only. Applies middleware chain (authMiddleware, requirePermission, validate). Delegates to controller methods.

**`[module].controller.ts`** — Parses `req`, calls service, returns `ApiResponse`. No raw DB queries. No business logic.

**`[module].service.ts`** — Business logic. Framework-agnostic (no `req`/`res`). Imports from `../../shared/db` and `../../shared/services/` as needed. May import types from sibling modules' `index.ts` only.

**`index.ts`** — Single export point:
```ts
export { router as employeeRouter } from './employee.routes';
```

**`app.ts` mount pattern:**
```ts
import { employeeRouter } from './modules/employee';
app.use('/api/v1/employees', authMiddleware, employeeRouter);
```

### Import Rules
- Modules import shared utilities via `../../shared/...`
- Cross-module imports are allowed only via the target module's `index.ts`
- No module imports from another module's internal files

---

## 4. Client Target Structure

```
client/
├── app/                        # ROUTING LAYER ONLY — zero business logic
│   ├── layout.tsx              # unchanged
│   ├── page.tsx                # unchanged
│   ├── globals.css
│   ├── favicon.ico
│   ├── api/auth/logout/route.ts
│   ├── auth/
│   │   ├── callback/page.tsx   # → <CallbackHandler />
│   │   ├── error/page.tsx      # → <AuthError />
│   │   └── logout/route.ts
│   ├── onboarding/
│   │   ├── page.tsx            # → <OnboardingFlow />
│   │   ├── pending/page.tsx    # → <OnboardingPending />
│   │   └── rejected/page.tsx   # → <OnboardingRejected />
│   └── dashboard/
│       ├── layout.tsx          # unchanged
│       ├── page.tsx            # dashboard summary (may stay thin as-is)
│       ├── settings/page.tsx   # → <OrgSettings />
│       ├── employees/
│       │   ├── page.tsx        # → <EmployeeList />
│       │   └── [id]/page.tsx   # → <EmployeeDetail />
│       ├── stores/
│       │   ├── page.tsx        # → <StoreList />
│       │   ├── [id]/page.tsx   # → <StoreDetail />
│       │   └── zones/page.tsx  # → <ZoneList />
│       ├── schedule/page.tsx   # → <ScheduleView />
│       └── surveys/
│           ├── page.tsx        # → <SurveyList />
│           └── [id]/page.tsx   # → <SurveyDetail />
│
├── features/                   # DOMAIN MODULES — self-contained
│   │
│   ├── auth/
│   │   ├── auth_agent.md
│   │   ├── components/
│   │   │   ├── CallbackHandler.tsx   # logic from app/auth/callback/page.tsx
│   │   │   └── AuthError.tsx         # logic from app/auth/error/page.tsx
│   │   ├── queries.ts                # useAuthMeQuery
│   │   ├── mutations.ts              # useAuthCallbackMutation, useLogoutMutation, useRefreshMutation
│   │   ├── api.ts                    # from lib/api/auth.api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── onboarding/
│   │   ├── onboarding_agent.md
│   │   ├── components/
│   │   │   ├── OnboardingFlow.tsx    # from app/onboarding/page.tsx
│   │   │   ├── OnboardingPending.tsx
│   │   │   ├── OnboardingRejected.tsx
│   │   │   └── StepRail.tsx          # from app/onboarding/components/
│   │   ├── mutations.ts              # org registration/update mutations
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── employees/
│   │   ├── employees_agent.md
│   │   ├── components/
│   │   │   ├── EmployeeList.tsx      # extracted from app/dashboard/employees/page.tsx
│   │   │   ├── EmployeeDetail.tsx    # extracted from [id]/page.tsx
│   │   │   └── AddEmployeeDialog.tsx # moved from app/.../components/
│   │   ├── queries.ts                # useEmployeesQuery, useEmployeeByIdQuery
│   │   ├── mutations.ts              # useCreateEmployee, useDeactivateEmployee, useReactivateEmployee, useAssignStoreManager
│   │   ├── api.ts                    # from lib/api/employees.api.ts
│   │   ├── types.ts                  # EmployeeRow, EmployeeDetail interfaces
│   │   └── index.ts
│   │
│   ├── stores/
│   │   ├── stores_agent.md
│   │   ├── components/
│   │   │   ├── StoreList.tsx         # extracted from page.tsx
│   │   │   ├── StoreDetail.tsx       # extracted from [id]/page.tsx
│   │   │   ├── AddStoreDialog.tsx
│   │   │   ├── BulkImportDialog.tsx
│   │   │   ├── EditStoreDialog.tsx
│   │   │   ├── MapView.tsx
│   │   │   ├── StoreScheduleTab.tsx
│   │   │   └── StoreSurveysTab.tsx
│   │   ├── queries.ts                # useStoresQuery, useStoreByIdQuery
│   │   ├── mutations.ts              # useCreateStore, useUpdateStore, useBulkImportStores
│   │   ├── api.ts                    # from lib/api/stores.api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── zones/
│   │   ├── zones_agent.md
│   │   ├── components/
│   │   │   ├── ZoneList.tsx          # extracted from zones/page.tsx
│   │   │   ├── AddZoneDialog.tsx
│   │   │   └── EditZoneDialog.tsx
│   │   ├── queries.ts                # useZonesQuery
│   │   ├── mutations.ts              # useCreateZone, useUpdateZone, useDeleteZone
│   │   ├── api.ts                    # from lib/api/zones.api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── schedule/
│   │   ├── schedule_agent.md
│   │   ├── components/
│   │   │   ├── ScheduleView.tsx      # extracted from page.tsx
│   │   │   ├── ScheduleCalendar.tsx  # moved from components/schedule/
│   │   │   ├── TemplateBuilderDialog.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── AssignmentsTab.tsx
│   │   │   ├── AssignSurveyorDialog.tsx
│   │   │   └── DayDetailDialog.tsx
│   │   ├── queries.ts                # useScheduleTemplatesQuery, useScheduleSlotsQuery
│   │   ├── mutations.ts              # useCreateTemplate, useAssignSurveyor, etc.
│   │   ├── api.ts                    # from lib/api/schedule.api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── surveys/
│   │   ├── surveys_agent.md
│   │   ├── components/
│   │   │   ├── SurveyList.tsx        # extracted from page.tsx
│   │   │   └── SurveyDetail.tsx      # extracted from [id]/page.tsx
│   │   ├── queries.ts                # useSurveysQuery, useSurveyByIdQuery
│   │   ├── mutations.ts
│   │   ├── api.ts                    # from lib/api/surveys.api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── settings/
│   │   ├── settings_agent.md
│   │   ├── components/
│   │   │   └── OrgSettings.tsx       # extracted from dashboard/settings/page.tsx
│   │   ├── queries.ts                # useOrgQuery — from useOrgQueries.ts
│   │   ├── mutations.ts              # useUpdateOrg — from useOrgMutations.ts
│   │   ├── api.ts                    # from lib/api/org.api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── lookups/
│   │   ├── lookups_agent.md
│   │   ├── queries.ts                # useIndustriesQuery, useStoreCategoriesQuery
│   │   ├── api.ts                    # from lib/api/lookups.api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   └── tours/
│       ├── tours_agent.md
│       ├── api.ts                    # from lib/api/tours.api.ts (no UI yet)
│       ├── types.ts
│       └── index.ts
│
├── components/
│   ├── ui/                           # shadcn/ui — unchanged
│   └── common/                       # truly global shared — unchanged
│   # NOTE: components/schedule/ is removed (moved to features/schedule/components/)
│
├── contexts/
│   └── auth-context.tsx              # global auth state — unchanged
│
├── hooks/
│   └── useAuth.ts                    # global auth hook — unchanged
│   # NOTE: hooks/queries/ and hooks/mutations/ are removed after migration
│
├── lib/
│   ├── api/
│   │   └── client.ts                 # Axios singleton + 401 refresh interceptor — stays
│   │   # NOTE: lib/api/index.ts and all *.api.ts files are removed after migration
│   ├── utils.ts
│   ├── phone.ts
│   ├── google-maps.ts
│   └── google-maps-styles.ts
│
├── providers/
│   └── TanstackProvider.tsx          # unchanged
│
└── middleware.ts                     # unchanged
```

### Client Feature File Conventions

**`queries.ts`** — TanStack Query `useQuery` hooks for this domain. All `queryKey` patterns and `queryFn` calls live here.

**`mutations.ts`** — TanStack Query `useMutation` hooks for this domain. Each mutation calls `queryClient.invalidateQueries()` in `onSuccess`.

**`api.ts`** — Raw async fetch functions using `apiClient` (Axios). No React. Can be called by hooks or tested in isolation.

**`types.ts`** — TypeScript interfaces and types specific to this domain. Not exported outside via `index.ts` unless needed cross-feature.

**`index.ts`** — Strict public gateway. Exports only what other features or pages need:
```ts
export { EmployeeList, EmployeeDetail, AddEmployeeDialog } from './components/...';
export { useEmployeesQuery, useEmployeeByIdQuery } from './queries';
export { useCreateEmployeeMutation } from './mutations';
export type { EmployeeRow } from './types';
```

**Page thin-wrapper pattern:**
```ts
// app/dashboard/employees/page.tsx
import { EmployeeList } from '@/features/employees';
export default function EmployeesPage() {
  return <EmployeeList />;
}
```

---

## 5. The `*_agent.md` Documentation Standard

Every module under `features/` and `modules/` contains a markdown spec file named `[module]_agent.md`.

### Required Sections

```markdown
# [Module Name] Module

## 1. Overview
One paragraph describing the business domain this module owns, what problems it solves,
and its relationship to other domains.

## 2. File Map
| File | Responsibility |
|------|---------------|
| [module].routes.ts | ... |
| ... | ... |

## 3. Public Contract
**Exports:** List every symbol exported from index.ts — components, hooks, functions, types.
**API routes (server):** List HTTP methods and paths.

## 4. Core Rules & Edge Cases
Bulleted list of domain-specific business rules, validation constraints, error codes,
and non-obvious behaviors that a new developer must know before modifying this module.
```

---

## 6. Migration Strategy

### Execution order (all at once on `modular` branch)

**Phase 1 — Server**
1. Create `server/src/shared/` — move db/, middlewares/, utils/
2. Move `email.service.ts` and `accessMap.service.ts` to `shared/services/`
3. Move `retryPendingApprovalEmails.ts` to `shared/jobs/`
4. Create `modules/` directory
5. For each domain (health → auth → org → employee → store → zone → schedule → survey → tour → lookups → admin):
   - Create module folder
   - Move route, controller, service files
   - Rename `validations/[m].validation.ts` → `modules/[m]/[m].types.ts`
   - Update all import paths (relative `../db` → `../../shared/db`, etc.)
   - Write `[m]_agent.md`
   - Create `index.ts`
6. Update `app.ts` to import from `./modules/[m]`
7. Delete old flat directories: `routes/`, `controllers/`, `services/`, `validations/`, `middlewares/`, `utils/`, `db/`, `jobs/`
8. TypeScript check: `npx tsc --noEmit`

**Phase 2 — Client**
1. Create `client/features/` directory
2. For each domain (auth → onboarding → employees → stores → zones → schedule → surveys → settings → lookups → tours):
   - Create feature folder with `components/`, `queries.ts`, `mutations.ts`, `api.ts`, `types.ts`, `index.ts`
   - Extract heavy UI from `app/**/*.tsx` into `features/*/components/`
   - Move hooks from `hooks/queries/` and `hooks/mutations/` into feature
   - Move API functions from `lib/api/` into feature `api.ts`
   - Update page files to be thin wrappers
   - Write `[feature]_agent.md`
3. Move `components/schedule/` → `features/schedule/components/`
4. Delete: `hooks/queries/`, `hooks/mutations/`, `lib/api/*.api.ts`, `lib/api/index.ts`
5. TypeScript check: `npx tsc --noEmit`

### Import path alias
The `@/` alias points to `client/` root. No changes needed — all new paths like `@/features/employees` resolve correctly without `tsconfig.json` changes.

---

## 7. What Does NOT Change

| Item | Reason |
|------|--------|
| `client/middleware.ts` | Framework edge middleware — not a domain concern |
| `client/app/layout.tsx`, `dashboard/layout.tsx` | Routing/provider setup |
| `client/components/ui/` | shadcn/ui primitives — not domain-specific |
| `client/components/common/` | Truly global shared components |
| `client/contexts/auth-context.tsx` | Global auth state used by root layout |
| `client/hooks/useAuth.ts` | Global hook — not domain-specific |
| `client/lib/api/client.ts` | Axios singleton — shared infrastructure |
| `client/lib/utils.ts`, `phone.ts`, `google-maps*.ts` | Utility functions — not domain-specific |
| `client/providers/TanstackProvider.tsx` | Global query provider |
| `server/src/app.ts`, `server.ts` | Only import paths change |
| `drizzle/` migrations | Schema history — untouched |
| `.env`, `.env.local` | Environment config — unchanged |
