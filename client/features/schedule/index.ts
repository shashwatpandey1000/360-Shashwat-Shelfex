export { default as ScheduleView } from './components/ScheduleView';
export { default as ScheduleCalendar } from './components/ScheduleCalendar';
export { default as TemplateBuilderDialog } from './components/TemplateBuilderDialog';
export { default as TemplateCard } from './components/TemplateCard';
export { default as AssignmentsTab } from './components/AssignmentsTab';
export { default as AssignSurveyorDialog } from './components/AssignSurveyorDialog';
export { default as DayDetailDialog } from './components/DayDetailDialog';

// Query hooks
export {
  useScheduleTemplatesQuery,
  useScheduleTemplateQuery,
  useOrgDefaultTemplateQuery,
  useStoreEffectiveTemplateQuery,
  useScheduleSlotsQuery,
  useScheduleSlotQuery,
  useScheduleAssignmentsQuery,
} from './queries';

// Mutation hooks
export {
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  usePreviewSlotsMutation,
  useMaterializeTemplateMutation,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  useDeleteRuleMutation,
  useCreateWindowMutation,
  useUpdateWindowMutation,
  useDeleteWindowMutation,
  useAssignSurveyorMutation,
  useUpdateSlotStatusMutation,
  useCreateAssignmentMutation,
  useDeleteAssignmentMutation,
} from './mutations';

// Types
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

// API object (for consumers that need direct access)
export { scheduleApi } from './api';
