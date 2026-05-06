'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlusCircle, Globe, RefreshCw, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/common/button';
import { useAuth } from '@/contexts/auth-context';
import { scheduleApi } from '@/lib/api/schedule.api';
import type { TemplateWithRules } from '@/lib/api/schedule.api';
import TemplateCard from '@/components/schedule/TemplateCard';
import TemplateBuilderDialog from '@/components/schedule/TemplateBuilderDialog';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { hasPermission, accessMap } = useAuth();
  const canWrite = hasPermission('schedule:write');
  const canManageEmployees = hasPermission('employees:manage');

  const [templates, setTemplates] = useState<TemplateWithRules[]>([]);
  const [loading, setLoading] = useState(true);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithRules | undefined>();
  const [materializing, setMaterializing] = useState<string | null>(null);

  const isOrgScope = accessMap?.scopeType === 'org';

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await scheduleApi.listTemplates();
      const detailed = await Promise.all(
        list.data.map((t) => scheduleApi.getTemplate(t.id).then((r) => r.data)),
      );
      setTemplates(detailed);
    } catch {
      toast.error('Failed to load schedule templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleMaterialize = async (templateId: string) => {
    setMaterializing(templateId);
    try {
      const res = await scheduleApi.materialize(templateId);
      toast.success(
        `Slots regenerated: ${res.data.created} created, ${res.data.skipped} already existed`,
      );
    } catch {
      toast.error('Failed to regenerate slots');
    } finally {
      setMaterializing(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this template? Future pending slots will be cancelled.')) return;
    try {
      await scheduleApi.deleteTemplate(templateId);
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const openEdit = (template: TemplateWithRules) => {
    setEditingTemplate(template);
    setBuilderOpen(true);
  };

  const openCreate = () => {
    setEditingTemplate(undefined);
    setBuilderOpen(true);
  };

  const orgDefaultTemplates = templates.filter((t) => t.storeId === null);
  const storeTemplates = templates.filter((t) => t.storeId !== null);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="bg-surface text-brand flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex h-max w-full shrink-0 items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold uppercase">Schedule</h1>
          <div className="flex w-max items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
            <CalendarDays size={14} />
            <span className="font-mono font-light">
              {templates.length} Template{templates.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-[13px] text-gray-500 xl:block dark:text-gray-400">
            Set org-wide default schedule and per-store overrides
          </p>
          {canWrite && (
            <CustomButton size="sm" onClick={openCreate}>
              <PlusCircle className="h-4 w-4" />
              New Template
            </CustomButton>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {(
          <div className="space-y-8">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading templates…
              </p>
            ) : (
              <>
                {/* Org-default templates */}
                {isOrgScope && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <h2 className="text-brand text-[14px] font-medium">Org-wide Default</h2>
                      <span className="text-[12px] text-gray-500 dark:text-gray-400">
                        Applied to all stores without a specific override
                      </span>
                    </div>

                    {orgDefaultTemplates.length === 0 ? (
                      <div className="bg-surface-muted/30 rounded-lg border border-dashed border-gray-300 py-10 text-center dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          No org-wide template yet
                        </p>
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-3 rounded-md border px-4 py-2 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
                            onClick={openCreate}
                          >
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                            Create Default Template
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {orgDefaultTemplates.map((t) => (
                          <TemplateCard
                            key={t.id}
                            template={t}
                            isDefault
                            canWrite={canWrite}
                            onEdit={() => openEdit(t)}
                            onDelete={() => handleDelete(t.id)}
                            onMaterialize={() => handleMaterialize(t.id)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Per-store override templates */}
                {storeTemplates.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-brand text-[14px] font-medium">Per-store Overrides</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {storeTemplates.map((t) => (
                        <TemplateCard
                          key={t.id}
                          template={t}
                          isDefault={false}
                          canWrite={canWrite}
                          onEdit={() => openEdit(t)}
                          onDelete={() => handleDelete(t.id)}
                          onMaterialize={() => handleMaterialize(t.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {templates.length === 0 && (
                  <div className="bg-surface-muted/30 rounded-lg border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
                    <RefreshCw className="mx-auto mb-3 h-8 w-8 text-gray-400 dark:text-gray-500" />
                    <p className="text-sm font-medium">No templates configured</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Create a schedule template to start generating survey slots.
                    </p>
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-4 rounded-md border px-4 py-2 text-[13px] hover:border-black hover:bg-gray-200 dark:hover:border-white dark:hover:bg-neutral-800"
                        onClick={openCreate}
                      >
                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                        Create First Template
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* Template builder dialog */}
      <TemplateBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        template={editingTemplate}
        onSaved={fetchTemplates}
      />
    </section>
  );
}
