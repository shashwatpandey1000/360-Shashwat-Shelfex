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
| types.ts | Local UI types not exported from api.ts |
| components/ScheduleView.tsx | Main schedule page — template list + calendar |
| components/ScheduleCalendar.tsx | Calendar grid rendering materialized slots |
| components/TemplateBuilderDialog.tsx | Multi-step template creation wizard |
| components/TemplateCard.tsx | Template preview with rule summary |
| components/AssignmentsTab.tsx | Surveyor assignment management |
| components/AssignSurveyorDialog.tsx | Assign surveyor to specific slot |
| components/DayDetailDialog.tsx | Detail view for a single calendar day |
| index.ts | Public exports |

## 3. Public Contract
**Exports:** ScheduleView, ScheduleCalendar, TemplateBuilderDialog, TemplateCard, AssignmentsTab, AssignSurveyorDialog, DayDetailDialog + all query/mutation hooks

## 4. Core Rules & Edge Cases
- Slot queries MUST always include a date range (server-side partitioned table)
- Template builder is a controlled multi-step form; do not persist intermediate steps to server
- previewSlots is a read-only dry-run call — use before creating final template
- Slot status: scheduled → in_progress → completed / missed
- Calendar shows 1 month at a time; fetching is triggered on month navigation
