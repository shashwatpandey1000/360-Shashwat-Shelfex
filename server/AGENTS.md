# Server — Agent Navigation Guide

## This codebase is modular. Do not scan the whole tree.

Each domain module owns its own agent reference doc. **Start there** before reading any source files.

---

## Module Index

| Module | Agent doc | API prefix |
|--------|-----------|------------|
| auth | `src/modules/auth/auth_agent.md` | `/api/v1/auth` |
| org | `src/modules/org/org_agent.md` | `/api/v1/orgs` |
| employee | `src/modules/employee/employee_agent.md` | `/api/v1/employees` |
| store | `src/modules/store/store_agent.md` | `/api/v1/stores` |
| zone | `src/modules/zone/zone_agent.md` | `/api/v1/zones` |
| schedule | `src/modules/schedule/schedule_agent.md` | `/api/v1/schedules` |
| survey | `src/modules/survey/survey_agent.md` | `/api/v1/surveys` |
| tour | `src/modules/tour/tour_agent.md` | `/api/v1/tours` |
| lookups | `src/modules/lookups/lookups_agent.md` | `/api/v1/lookups` |
| admin | `src/modules/admin/admin_agent.md` | `/api/v1/admin` |
| health | `src/modules/health/` | `/api/v1/health` |

---

## How to navigate

1. Identify which module the task touches.
2. Read that module's `*_agent.md` — it describes files, routes, service functions, and edge cases.
3. Open only the specific files you need from that module.
4. Shared infrastructure lives in `src/shared/` — read those only if the task crosses module boundaries.

---

## Shared infrastructure

| Path | What it is |
|------|------------|
| `src/shared/db/` | Drizzle ORM instance + all schema files |
| `src/shared/middlewares/` | auth, tenant, permission, validate, error, rateLimiter |
| `src/shared/utils/ApiResponse.ts` | Standardised response builder |
| `src/shared/utils/asyncHandler.ts` | Wraps async controllers for Express error propagation |

---

## Request pipeline (every authenticated route)

```
Route → authMiddleware → tenantContext → requirePermission() → validate(zodSchema) → controller → service
```

---

## Adding a new feature or updating existing code

### Step 1 — Read before writing
- Read the relevant module's `*_agent.md` first.
- Read the specific files you will touch. Never guess at structure.
- If the task touches the DB schema, read `src/shared/db/schema/` for the relevant table.

### Step 2 — Module structure (mandatory for every module)

Every module lives at `src/modules/<name>/` and must contain exactly these files:

```
src/modules/<name>/
  <name>.routes.ts      # Express Router — route definitions only, no logic
  <name>.controller.ts  # Thin handlers — parse req, call service, return ApiResponse
  <name>.service.ts     # All business logic and DB access
  <name>.types.ts       # Zod schemas and TypeScript types
  index.ts              # Barrel export: router + any cross-module service/type exports
  <name>_agent.md       # Agent reference doc — update this when you change the module
```

Never put business logic in a controller. Never put DB calls in a route file.

### Step 3 — Adding a new API endpoint

Follow this exact sequence:

1. **Schema first** — if the endpoint needs a new DB table or column, add it to `src/shared/db/schema/`, run `npm run db:generate` then `npm run db:migrate`.
2. **Type** — add the Zod input schema to `<name>.types.ts`.
3. **Service** — add the business logic function to `<name>.service.ts`. No `req`/`res` here.
4. **Controller** — add a thin handler to `<name>.controller.ts`:
   ```ts
   export const myHandler = asyncHandler(async (req, res) => {
     const input = mySchema.parse(req.body); // or rely on validate() middleware
     const result = await myServiceFn(req.orgId!, input);
     ApiResponse.success(res, result, 'Done');
   });
   ```
5. **Route** — register in `<name>.routes.ts` with the full middleware chain:
   ```ts
   router.post('/path', authMiddleware, tenantContext, requirePermission('resource:action'), validate(mySchema), myHandler);
   ```
6. **Mount** — if it's a new module, mount the router in `src/app.ts`.
7. **Update agent doc** — add the new route to `<name>_agent.md`.

### Step 4 — Validation rules

- All request bodies validated with `validate(zodSchema)` middleware **before** the controller runs.
- Never call `schema.parse(req.body)` inside a controller as the sole validation — use the middleware so errors return 400, not 500.
- Query params validated inline with `schema.parse(req.query)` in the controller is acceptable.

### Step 5 — Response format

Always use `ApiResponse.*` — never call `res.json()` directly:

```ts
ApiResponse.success(res, data, 'Optional message')   // 200
ApiResponse.created(res, data, 'Created')             // 201
ApiResponse.badRequest(res, 'Reason')                 // 400
ApiResponse.unauthorized(res, 'Reason')               // 401
ApiResponse.forbidden(res, 'Reason')                  // 403
ApiResponse.notFound(res, 'Thing not found')          // 404
ApiResponse.error(res, 'Server error')                // 500
```

### Step 6 — Database access

- All DB access goes through Drizzle ORM — never raw SQL strings.
- Import `db` from `src/shared/db`.
- Import table schemas from `src/shared/db/schema/`.
- Multi-step operations that must be atomic go in a `db.transaction()` block.

### Step 7 — Error handling

- Business rule errors (not found, conflict, forbidden): throw a plain object `{ message, statusCode }` and catch it in the controller.
- Unexpected errors: let them bubble through `asyncHandler` to the global error middleware.
- Never swallow errors silently.

### Step 8 — Tests

- Every new service function needs a unit test in `src/modules/<name>/__tests__/<name>.service.test.ts`.
- Every new route needs an e2e test in `src/modules/<name>/__tests__/<name>.e2e.test.ts`.
- Mock `src/shared/db` with `vi.mock` — never hit a real database in unit tests.
- Use `makeChain()` from `src/__tests__/helpers/db.mock.ts` to mock Drizzle chains.
- Run `npm test` before considering a task done.

---

## Key conventions (quick reference)

- Controllers are thin: one service call, one `ApiResponse.*` return.
- Services own all logic: no `req`/`res`, no HTTP concepts.
- Zod schemas in `<name>.types.ts`; validation via `validate()` middleware on the route.
- All routes under `/api/v1` — mounted in `src/app.ts`.
- Never add a new shared middleware without confirming it belongs in `src/shared/middlewares/`.
- Update `<name>_agent.md` every time you change a module's public contract.
