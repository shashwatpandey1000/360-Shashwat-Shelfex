# Client — Agent Navigation Guide

## This codebase is modular. Do not scan the whole tree.

Each feature owns its own agent reference doc. **Start there** before reading any source files.

## Feature Index

| Feature | Agent doc | What it owns |
|---------|-----------|--------------|
| auth | `features/auth/auth_agent.md` | OAuth callback, SSO login, token handling |
| employees | `features/employees/employees_agent.md` | Employee CRUD, roles, scope |
| stores | `features/stores/stores_agent.md` | Store CRUD, bulk import, manager assignment |
| zones | `features/zones/zones_agent.md` | Zone hierarchy management |
| schedule | `features/schedule/schedule_agent.md` | Templates, rules, windows, slots, assignments |
| surveys | `features/surveys/surveys_agent.md` | Survey execution, photos, scenes |
| tours | `features/tours/tours_agent.md` | Virtual tour sync and viewer |
| onboarding | `features/onboarding/onboarding_agent.md` | First-time org setup flow |
| settings | `features/settings/settings_agent.md` | Org settings management |
| lookups | `features/lookups/lookups_agent.md` | Industries and store categories reference data |

## How to navigate

1. Identify which feature the task touches.
2. Read that feature's `*_agent.md` — it describes components, hooks, API calls, and state.
3. Open only the specific files you need from that feature.
4. Shared infrastructure lives outside `features/` — read those only when the task crosses feature boundaries.

## Shared infrastructure

| Path | What it is |
|------|------------|
| `lib/api/*.api.ts` | Domain API objects (axios calls per domain) |
| `lib/api/index.ts` | Barrel export for all API functions and types |
| `hooks/queries/` | TanStack Query `useQuery` hooks per domain |
| `hooks/mutations/` | TanStack Query `useMutation` hooks per domain |
| `contexts/auth-context.tsx` | Global auth state: `useAuth()`, `hasPermission()`, `hasModule()` |
| `components/ui/` | shadcn/ui base components |
| `components/common/` | Shared app-level components |
| `providers/TanstackProvider.tsx` | QueryClient provider |
| `middleware.ts` | Edge middleware: JWT check, token refresh, SSO redirect |

## Key conventions

- Each feature exports components, hooks, and types from its own `index.ts`
- Data fetching always goes through TanStack Query hooks — never call API functions directly in components
- Mutations call `queryClient.invalidateQueries()` in `onSuccess` to keep cache consistent
- Permission checks use `hasPermission('resource:action')` from `useAuth()`
- Query keys: list → `["resource", params]`, single → `["resource", id]`

## App structure

```
app/                  # Next.js App Router pages
  auth/               # OAuth callback + error pages
  onboarding/         # First-time setup
  dashboard/          # Main app (all features rendered here)
features/             # Feature modules (components + hooks + API)
components/           # Shared components
hooks/                # Shared query/mutation hooks
lib/api/              # API client and domain API objects
contexts/             # Auth context
providers/            # TanStack Query provider
middleware.ts         # Edge auth/refresh logic
```
