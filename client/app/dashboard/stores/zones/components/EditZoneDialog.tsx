'use client';

import { useEffect, useState } from 'react';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { useUpdateZoneMutation } from '@/hooks/mutations/useZoneMutations';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface EditZoneDialogProps {
  zone: { id: string; name: string; description: string | null; parentZoneId: string | null };
  allZones: { id: string; name: string; parentZoneId: string | null }[];
  onUpdated: () => void;
  onClose: () => void;
}

export default function EditZoneDialog({ zone, allZones, onUpdated, onClose }: EditZoneDialogProps) {
  const updateZone = useUpdateZoneMutation();

  const [name, setName] = useState(zone.name);
  const [description, setDescription] = useState(zone.description || '');
  const [parentZoneId, setParentZoneId] = useState(zone.parentZoneId || '');

  useEffect(() => {
    setName(zone.name);
    setDescription(zone.description || '');
    setParentZoneId(zone.parentZoneId || '');
  }, [zone]);

  // Filter out the zone itself and its descendants from parent options (prevent circular refs)
  const getDescendantIds = (zoneId: string): Set<string> => {
    const ids = new Set<string>([zoneId]);
    const children = allZones.filter((z) => z.parentZoneId === zoneId);
    for (const child of children) {
      for (const id of getDescendantIds(child.id)) {
        ids.add(id);
      }
    }
    return ids;
  };

  const excludeIds = getDescendantIds(zone.id);
  const parentOptions = allZones.filter((z) => !excludeIds.has(z.id));

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Zone name is required');
      return;
    }

    try {
      await updateZone.mutateAsync({
        id: zone.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          parentZoneId: parentZoneId || null,
        },
      });
      toast.success('Zone updated');
      onUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update zone';
      toast.error(msg);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="rounded-lg sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Zone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <CustomInput.Text
            id="edit-zone-name"
            label="Zone Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <CustomInput.Text
            id="edit-zone-description"
            label="Description"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <CustomInput.Select
            id="edit-zone-parent"
            label="Parent Zone"
            value={parentZoneId}
            onChange={(e) => setParentZoneId(e.target.value)}
            options={[
              { value: '', label: 'None (top-level zone)' },
              ...parentOptions.map((z) => ({ value: z.id, label: z.name })),
            ]}
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" onClick={handleSubmit} disabled={updateZone.isPending}>
            {updateZone.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
            {updateZone.isPending ? 'Saving...' : 'Save Changes'}
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
