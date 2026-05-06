'use client';

import { useState } from 'react';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { zonesApi } from '@/lib/api/zones.api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AddZoneDialogProps {
  allZones: { id: string; name: string; parentZoneId: string | null }[];
  onCreated: () => void;
  trigger: React.ReactNode;
}

export default function AddZoneDialog({ allZones, onCreated, trigger }: AddZoneDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentZoneId, setParentZoneId] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setParentZoneId('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Zone name is required');
      return;
    }

    setSubmitting(true);
    try {
      await zonesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        parentZoneId: parentZoneId || null,
      });
      toast.success('Zone created');
      reset();
      setOpen(false);
      onCreated();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create zone';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-lg sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Zone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <CustomInput.Text
            id="zone-name"
            label="Zone Name"
            placeholder="e.g. North Region, Delhi NCR"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <CustomInput.Text
            id="zone-description"
            label="Description"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <CustomInput.Select
            id="zone-parent"
            label="Parent Zone"
            value={parentZoneId}
            onChange={(e) => setParentZoneId(e.target.value)}
            options={[
              { value: '', label: 'None (top-level zone)' },
              ...allZones.map((z) => ({ value: z.id, label: z.name })),
            ]}
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <CustomButton variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 size={14} className="mr-1 animate-spin" />}
            {submitting ? 'Creating...' : 'Create Zone'}
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
