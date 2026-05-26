"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleApi } from "./api";
import type { RecurrenceRule, TimeWindow } from "./api";

// ── Templates ──────────────────────────────────────────────────────────────

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof scheduleApi.createTemplate>[0]) =>
      scheduleApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplates"] });
    },
  });
}

export function useUpdateTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof scheduleApi.updateTemplate>[1] }) =>
      scheduleApi.updateTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", id] });
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplates"] });
    },
  });
}

export function useDeleteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplates"] });
    },
  });
}

export function usePreviewSlotsMutation() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { dateFrom: string; dateTo: string; storeId?: string } }) =>
      scheduleApi.previewSlots(id, data),
  });
}

export function useMaterializeTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleApi.materialize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleSlots"] });
    },
  });
}

// ── Rules ──────────────────────────────────────────────────────────────────

export function useCreateRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Parameters<typeof scheduleApi.createRule>[1] }) =>
      scheduleApi.createRule(templateId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", templateId] });
    },
  });
}

export function useUpdateRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ruleId, data }: { templateId: string; ruleId: string; data: Partial<RecurrenceRule> }) =>
      scheduleApi.updateRule(templateId, ruleId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", templateId] });
    },
  });
}

export function useDeleteRuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ruleId }: { templateId: string; ruleId: string }) =>
      scheduleApi.deleteRule(templateId, ruleId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", templateId] });
    },
  });
}

// ── Windows ────────────────────────────────────────────────────────────────

export function useCreateWindowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ruleId, data }: { templateId: string; ruleId: string; data: Parameters<typeof scheduleApi.createWindow>[2] }) =>
      scheduleApi.createWindow(templateId, ruleId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", templateId] });
    },
  });
}

export function useUpdateWindowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ruleId, windowId, data }: { templateId: string; ruleId: string; windowId: string; data: Partial<TimeWindow> }) =>
      scheduleApi.updateWindow(templateId, ruleId, windowId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", templateId] });
    },
  });
}

export function useDeleteWindowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ruleId, windowId }: { templateId: string; ruleId: string; windowId: string }) =>
      scheduleApi.deleteWindow(templateId, ruleId, windowId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", templateId] });
    },
  });
}

// ── Slots ──────────────────────────────────────────────────────────────────

export function useAssignSurveyorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, surveyorId, force }: { slotId: string; surveyorId: string; force?: boolean }) =>
      scheduleApi.assignSurveyor(slotId, surveyorId, force),
    onSuccess: (_, { slotId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleSlot", slotId] });
      queryClient.invalidateQueries({ queryKey: ["scheduleSlots"] });
    },
  });
}

export function useUpdateSlotStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, status }: { slotId: string; status: "cancelled" | "skipped" | "excused" }) =>
      scheduleApi.updateSlotStatus(slotId, status),
    onSuccess: (_, { slotId }) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleSlot", slotId] });
      queryClient.invalidateQueries({ queryKey: ["scheduleSlots"] });
    },
  });
}

// ── Persistent Assignments ─────────────────────────────────────────────────

export function useCreateAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof scheduleApi.createAssignment>[0]) =>
      scheduleApi.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleAssignments"] });
    },
  });
}

export function useDeleteAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleApi.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleAssignments"] });
    },
  });
}
