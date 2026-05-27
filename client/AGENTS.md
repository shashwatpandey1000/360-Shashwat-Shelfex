# Client — Agent Navigation Guide

## This codebase is modular. Do not scan the whole tree.

Each feature owns its own agent reference doc. **Start there** before reading any source files.

---

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

---

## How to navigate

1. Identify which feature the task touches.
2. Read that feature's `*_agent.md` — it describes components, hooks, API calls, and state.
3. Open only the specific files you need from that feature.
4. Shared infrastructure lives outside `features/` — read those only when the task crosses feature boundaries.

---

## Shared infrastructure

| Path | What it is |
|------|------------|
| `lib/api/client.ts` | Axios instance with auto token-refresh on 401 |
| `contexts/auth-context.tsx` | Global auth state: `useAuth()`, `hasPermission()`, `hasModule()` |
| `components/ui/` | shadcn/ui base components |
| `components/common/` | Shared app-level components |
| `providers/TanstackProvider.tsx` | QueryClient provider |
| `middleware.ts` | Edge middleware: JWT check, token refresh, SSO redirect |

---

## App structure

```
app/                  # Next.js App Router pages (routing only — no business logic)
  auth/               # OAuth callback + error pages
  onboarding/         # First-time setup
  dashboard/          # Main app shell; each section delegates to features/
features/             # All feature modules live here
  <name>/
    components/       # UI components for this feature
    api.ts            # Axios calls for this feature's API endpoints
    queries.ts        # TanStack Query useQuery hooks (GET requests)
    mutations.ts      # TanStack Query useMutation hooks (POST/PUT/PATCH/DELETE)
    types.ts          # Local TypeScript types
    index.ts          # Public exports from this feature
    <name>_agent.md   # Agent reference doc — update when the feature changes
components/           # Shared components used across features
lib/api/              # Shared API client
contexts/             # Auth context
providers/            # TanStack Query provider
middleware.ts         # Edge auth/refresh logic
```

---

## Adding a new feature or updating existing code

### Step 1 — Read before writing
- Read the relevant feature's `*_agent.md` first.
- Read the specific files you will touch. Never guess at structure.
- Check the shared infrastructure table above before creating anything new in `components/` or `lib/`.

### Step 2 — Feature module structure (mandatory)

Every feature lives at `features/<name>/` and follows this exact layout:

```
features/<name>/
  components/         # React components owned by this feature
  api.ts              # All axios calls for this feature — imported only by queries.ts / mutations.ts
  queries.ts          # All useQuery hooks (data fetching / GET)
  mutations.ts        # All useMutation hooks (POST / PUT / PATCH / DELETE) — create only if needed
  types.ts            # TypeScript types local to this feature
  index.ts            # Public exports: components, hooks, types
  <name>_agent.md     # Agent reference doc — keep it up to date
```

### Step 3 — Data fetching rules

**GET data → `queries.ts`**
```ts
// queries.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { myFeatureApi } from './api';

export function useMyResourceQuery(id: string) {
  return useQuery({
    queryKey: ['myResource', id],
    queryFn: () => myFeatureApi.getById(id),
    enabled: !!id,
  });
}
```

**POST / PUT / PATCH / DELETE → `mutations.ts`**
```ts
// mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { myFeatureApi } from './api';

export function useCreateMyResourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => myFeatureApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myResource'] });
    },
  });
}
```

**Never call `api.ts` functions directly inside a component.** Always go through a hook in `queries.ts` or `mutations.ts`.

### Step 4 — API functions (`api.ts`)

All axios calls for a feature belong in that feature's `api.ts`. Use the shared `apiClient` from `lib/api/client.ts`:

```ts
// api.ts
import apiClient from '@/lib/api/client';

export const myFeatureApi = {
  async getById(id: string) {
    const res = await apiClient.get(`/my-resource/${id}`);
    return res.data as { success: boolean; data: MyType };
  },
  async create(input: CreateInput) {
    const res = await apiClient.post('/my-resource', input);
    return res.data as { success: boolean; data: MyType };
  },
};
```

### Step 5 — Query key conventions

| Pattern | Key format |
|---------|-----------|
| List with filters | `['myResource', params]` |
| Single item | `['myResource', id]` |
| Nested/scoped | `['myResource', 'active', parentId]` |

Invalidate at the collection level when a mutation changes the list: `{ queryKey: ['myResource'] }`.

### Step 6 — Components

- Components live in `features/<name>/components/`.
- One component per file, named after what it renders.
- No data fetching inside components — receive data as props or call a hook from `queries.ts`.
- Use `hasPermission('resource:action')` from `useAuth()` to gate UI elements.
- Use shadcn/ui primitives from `components/ui/` — never install a new UI library without checking if shadcn already covers it.

### Step 7 — Exports (`index.ts`)

Export everything the rest of the app needs from the feature's `index.ts`. Pages and other features import from `features/<name>` — never from a deep path like `features/<name>/components/MyComponent`.

```ts
// index.ts
export { MyList, MyDetail } from './components/MyList';
export { useMyResourceQuery } from './queries';
export { useCreateMyResourceMutation } from './mutations';
export type { MyType } from './types';
```

### Step 8 — Pages (`app/dashboard/`)

Pages are thin. They:
1. Read route params / search params.
2. Call feature hooks to get data.
3. Render feature components.
4. Do nothing else.

```tsx
// app/dashboard/stores/[id]/page.tsx
import { StoreDetail } from '@/features/stores';

export default function StorePage({ params }: { params: { id: string } }) {
  return <StoreDetail storeId={params.id} />;
}
```

### Step 9 — Permission checks

Gate any action that requires a permission:

```tsx
const { hasPermission } = useAuth();
if (!hasPermission('stores:write')) return null;
```

### Step 10 — Update the agent doc

After changing a feature's public contract (new components, new hooks, new API calls), update `features/<name>/<name>_agent.md` so the next agent has accurate context.

---

## Key conventions (quick reference)

- `queries.ts` → GET (read). `mutations.ts` → POST/PUT/PATCH/DELETE (write).
- Never call `api.ts` directly from a component.
- Never fetch data in a page file — delegate to a feature component.
- Always invalidate the right query keys after a mutation.
- Export from `index.ts` — never from deep internal paths.
- Keep `*_agent.md` up to date whenever you change a feature's public contract.
