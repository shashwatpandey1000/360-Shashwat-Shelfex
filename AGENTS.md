# ShelfEx 360 — Agent Navigation Guide

## Read this first. Every time.

This repo has two sides: a **server** (Express + Drizzle ORM) and a **client** (Next.js + TanStack Query).
Each side has its own detailed navigation guide. **Do not scan the codebase. Go straight to the right guide.**

---

## Step 1 — Pick your side

| You are working on... | Read this next |
|-----------------------|----------------|
| API endpoints, services, DB schema, middleware | [`server/AGENTS.md`](./server/AGENTS.md) |
| UI components, pages, hooks, API calls | [`client/AGENTS.md`](./client/AGENTS.md) |
| A feature that touches both | Read both |

---

## Step 2 — Then go to the module's agent doc

Both `server/AGENTS.md` and `client/AGENTS.md` contain a full module index that points you to the
specific `*_agent.md` for the feature you are working on. Read that before opening any source files.

---

## Repo structure at a glance

```
360-Shashwat-Shelfex/
  server/               # Express API — Node.js, TypeScript, Drizzle ORM
    src/
      modules/          # One folder per domain (auth, employee, store, schedule, ...)
      shared/           # DB instance, middlewares, utils
    AGENTS.md           # Server navigation guide + module index
  client/               # Next.js App Router — React, TanStack Query, shadcn/ui
    features/           # One folder per feature (employees, stores, schedule, ...)
    app/                # Next.js pages (thin — delegate to features/)
    components/         # Shared UI components
    AGENTS.md           # Client navigation guide + feature index
```

---

## What this app does

ShelfEx 360 is a field execution platform. Organizations schedule surveyors to visit retail stores,
conduct surveys (photo capture), and view 360° virtual tours of store shelves.

Core hierarchy: **Org → Zones → Stores → Schedules → Surveys / Tours**

---

## Rules for every agent

- Never run `ls`, `find`, or broad `grep` as your first action.
- Always read the module/feature `*_agent.md` before opening `.ts` or `.tsx` files.
- Keep `*_agent.md` files up to date whenever you change a module's public contract.
