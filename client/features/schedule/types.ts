// Re-export all shared types from api.ts for consumers that want a dedicated types import.
// The canonical source of truth for API types is ./api.ts.
export type {
  ScheduleTemplate,
  RecurrenceRule,
  TimeWindow,
  TemplateWithRules,
  ScheduleSlot,
  SlotStatus,
  PersistentAssignment,
  PreviewSlot,
  PaginatedSlots,
} from './api';
