import apiClient from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleTemplate {
  id: string;
  orgId: string;
  storeId: string | null;
  name: string;
  timezone: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenceRule {
  id: string;
  orgId: string;
  scheduleTemplateId: string;
  recurrenceType: 'daily' | 'weekdays' | 'specific_days' | 'odd_days' | 'even_days' | 'interval' | 'custom_rrule';
  daysOfWeek: number[] | null;
  intervalValue: number | null;
  intervalUnit: 'day' | 'week' | null;
  customRrule: string | null;
  exceptions: { skip_dates?: string[] } | null;
  createdAt: string;
  updatedAt: string;
  windows?: TimeWindow[];
}

export interface TimeWindow {
  id: string;
  orgId: string;
  recurrenceRuleId: string;
  windowStart: string;
  windowEnd: string;
  label: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateWithRules extends ScheduleTemplate {
  rules: (RecurrenceRule & { windows: TimeWindow[] })[];
}

export type SlotStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'skipped'
  | 'excused';

export interface ScheduleSlot {
  id: string;
  orgId: string;
  storeId: string;
  storeName: string | null;
  scheduleTemplateId: string;
  recurrenceRuleId: string;
  timeWindowId: string;
  scheduledDate: string;
  windowStartUtc: string;
  windowEndUtc: string;
  windowStartLocal: string;
  windowEndLocal: string;
  timezone: string;
  windowLabel: string | null;
  status: SlotStatus;
  assignedSurveyorId: string | null;
  assignedSurveyorName: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  surveyId: string | null;
  materializedAt: string;
}

export interface PersistentAssignment {
  id: string;
  storeId: string;
  storeName: string | null;
  recurrenceRuleId: string;
  timeWindowId: string;
  windowStart: string | null;
  windowEnd: string | null;
  windowLabel: string | null;
  surveyorId: string;
  surveyorName: string | null;
  assignedBy: string;
  createdAt: string;
}

export interface PreviewSlot {
  date: string;
  windowStart: string;
  windowEnd: string;
  timezone: string;
  label: string | null;
}

export interface PaginatedSlots {
  data: ScheduleSlot[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ─── Template API ─────────────────────────────────────────────────────────────

export const scheduleApi = {
  // Templates
  async createTemplate(data: {
    name: string;
    storeId?: string | null;
    timezone: string;
    effectiveFrom: string;
    effectiveUntil?: string | null;
  }) {
    const res = await apiClient.post('/schedules/templates', data);
    return res.data as { success: boolean; data: ScheduleTemplate };
  },

  async listTemplates() {
    const res = await apiClient.get('/schedules/templates');
    return res.data as { success: boolean; data: ScheduleTemplate[] };
  },

  async getTemplate(id: string) {
    const res = await apiClient.get(`/schedules/templates/${id}`);
    return res.data as { success: boolean; data: TemplateWithRules };
  },

  async getOrgDefaultTemplate() {
    const res = await apiClient.get('/schedules/templates/default');
    return res.data as { success: boolean; data: TemplateWithRules };
  },

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      timezone?: string;
      effectiveFrom?: string;
      effectiveUntil?: string | null;
      isActive?: boolean;
    },
  ) {
    const res = await apiClient.patch(`/schedules/templates/${id}`, data);
    return res.data as { success: boolean; data: ScheduleTemplate };
  },

  async deleteTemplate(id: string) {
    const res = await apiClient.delete(`/schedules/templates/${id}`);
    return res.data as { success: boolean };
  },

  async previewSlots(id: string, data: { dateFrom: string; dateTo: string; storeId?: string }) {
    const res = await apiClient.post(`/schedules/templates/${id}/preview`, data);
    return res.data as { success: boolean; data: PreviewSlot[] };
  },

  async materialize(id: string) {
    const res = await apiClient.post(`/schedules/templates/${id}/materialize`);
    return res.data as { success: boolean; data: { created: number; skipped: number } };
  },

  // Rules
  async createRule(
    templateId: string,
    data: {
      recurrenceType: RecurrenceRule['recurrenceType'];
      daysOfWeek?: number[] | null;
      intervalValue?: number | null;
      intervalUnit?: 'day' | 'week' | null;
      exceptions?: { skip_dates?: string[] } | null;
    },
  ) {
    const res = await apiClient.post(`/schedules/templates/${templateId}/rules`, data);
    return res.data as { success: boolean; data: RecurrenceRule };
  },

  async updateRule(templateId: string, ruleId: string, data: Partial<RecurrenceRule>) {
    const res = await apiClient.patch(
      `/schedules/templates/${templateId}/rules/${ruleId}`,
      data,
    );
    return res.data as { success: boolean; data: RecurrenceRule };
  },

  async deleteRule(templateId: string, ruleId: string) {
    const res = await apiClient.delete(
      `/schedules/templates/${templateId}/rules/${ruleId}`,
    );
    return res.data as { success: boolean };
  },

  // Windows
  async createWindow(
    templateId: string,
    ruleId: string,
    data: {
      windowStart: string;
      windowEnd: string;
      label?: string | null;
      displayOrder?: number;
    },
  ) {
    const res = await apiClient.post(
      `/schedules/templates/${templateId}/rules/${ruleId}/windows`,
      data,
    );
    return res.data as { success: boolean; data: TimeWindow };
  },

  async updateWindow(
    templateId: string,
    ruleId: string,
    windowId: string,
    data: Partial<TimeWindow>,
  ) {
    const res = await apiClient.patch(
      `/schedules/templates/${templateId}/rules/${ruleId}/windows/${windowId}`,
      data,
    );
    return res.data as { success: boolean; data: TimeWindow };
  },

  async deleteWindow(templateId: string, ruleId: string, windowId: string) {
    const res = await apiClient.delete(
      `/schedules/templates/${templateId}/rules/${ruleId}/windows/${windowId}`,
    );
    return res.data as { success: boolean };
  },

  // Slots
  async listSlots(params?: {
    page?: number;
    perPage?: number;
    storeId?: string;
    status?: SlotStatus;
    dateFrom?: string;
    dateTo?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const res = await apiClient.get('/schedules/slots', { params });
    return res.data as { success: boolean; data: PaginatedSlots };
  },

  async getSlot(id: string) {
    const res = await apiClient.get(`/schedules/slots/${id}`);
    return res.data as { success: boolean; data: ScheduleSlot };
  },

  async assignSurveyor(slotId: string, surveyorId: string, force?: boolean) {
    const res = await apiClient.patch(`/schedules/slots/${slotId}/assign`, { surveyorId, ...(force ? { force } : {}) });
    return res.data as { success: boolean; data: ScheduleSlot };
  },

  async updateSlotStatus(slotId: string, status: 'cancelled' | 'skipped' | 'excused') {
    const res = await apiClient.patch(`/schedules/slots/${slotId}/status`, { status });
    return res.data as { success: boolean; data: ScheduleSlot };
  },

  // Persistent Assignments
  async listAssignments(storeId?: string) {
    const res = await apiClient.get('/schedules/assignments', {
      params: storeId ? { storeId } : undefined,
    });
    return res.data as { success: boolean; data: PersistentAssignment[] };
  },

  async createAssignment(data: {
    storeId: string;
    recurrenceRuleId: string;
    timeWindowId: string;
    surveyorId: string;
  }) {
    const res = await apiClient.post('/schedules/assignments', data);
    return res.data as { success: boolean; data: PersistentAssignment };
  },

  async deleteAssignment(id: string) {
    const res = await apiClient.delete(`/schedules/assignments/${id}`);
    return res.data as { success: boolean };
  },

  // Store effective template
  async getStoreEffectiveTemplate(storeId: string) {
    const res = await apiClient.get(`/schedules/stores/${storeId}/template`);
    return res.data as {
      success: boolean;
      data: ScheduleTemplate & { source: 'override' | 'org_default' };
    };
  },
};
