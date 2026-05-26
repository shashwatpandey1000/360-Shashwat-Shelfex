# Schedule Module

## 1. Overview
Manages the scheduling engine: templates, recurrence rules, time windows, and materialized slots.
This is the most complex module. Templates define WHAT to schedule (which stores, which surveyors);
recurrence rules define WHEN (daily/weekly/monthly patterns); time windows define the TIME of day.
A daily cron job (02:00 UTC) materializes `schedule_instances` rows for the next 14 days.

## 2. File Map
| File | Responsibility |
|------|---------------|
| schedule.routes.ts | Route definitions for templates, rules, windows, slots, assignments |
| schedule.controller.ts | Parse req, call service, return ApiResponse |
| schedule.service.ts | Business logic: template CRUD, slot queries, assignment management |
| schedule.materializer.ts | Slot generation engine — creates schedule_instances from templates + rules |
| schedule.types.ts | Zod schemas for all schedule inputs; inferred TS types |
| index.ts | Exports `scheduleRouter`, `materializeAllOrgs`, `getMaterializationWindow` |

## 3. Public Contract
**Server exports:** `scheduleRouter` (mounted at `/api/v1/schedules`)
**Cross-module exports:** `materializeAllOrgs`, `getMaterializationWindow` (used by `server.ts` cron)

**Key Routes:**
- `POST /schedules/templates` — create template
- `GET /schedules/templates` — list templates for org
- `POST /schedules/templates/:id/rules` — add recurrence rule
- `POST /schedules/templates/:id/rules/:ruleId/windows` — add time window
- `GET /schedules/slots` — list materialized slots with date range filter
- `POST /schedules/slots/:id/assign` — assign surveyor to slot
- `POST /schedules/preview` — preview slots before materializing

## 4. Core Rules & Edge Cases
- `schedule_instances` table is PARTITIONED by date — queries MUST include a date range
- The materializer runs daily at 02:00 UTC and generates 14 days ahead; avoid manual inserts
- Surveyor assignments persist across slot regeneration via `surveyor_assignments` table
- A template can have multiple recurrence rules; a rule can have multiple time windows
- Deactivating a template stops future slot generation but does NOT delete existing slots
- `previewSlots` is a dry-run that returns what would be materialized without writing to DB
