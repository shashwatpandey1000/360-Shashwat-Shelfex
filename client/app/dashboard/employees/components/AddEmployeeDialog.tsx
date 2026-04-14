'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import { employeesApi } from '@/lib/api/employees.api';
import { storesApi } from '@/lib/api/stores.api';
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

const ROLE_OPTIONS = [
  { value: 'org_manager', label: 'Organization Manager' },
  { value: 'zone_manager', label: 'Zone Manager' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'surveyor', label: 'Surveyor' },
];

const SCOPE_OPTIONS = [
  { value: 'org', label: 'Entire Organization' },
  { value: 'zones', label: 'Specific Zones' },
  { value: 'stores', label: 'Specific Stores' },
];

interface AddEmployeeDialogProps {
  onCreated: () => void;
  trigger: React.ReactNode;
}

export default function AddEmployeeDialog({ onCreated, trigger }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTemplate, setRoleTemplate] = useState('store_manager');
  const [scopeType, setScopeType] = useState('stores');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // Searchable store picker
  const [storeSearch, setStoreSearch] = useState('');
  const [storeResults, setStoreResults] = useState<{ id: string; name: string }[]>([]);
  const [storeSearching, setStoreSearching] = useState(false);
  // Cache selected store names so they show even when search changes
  const [selectedStoreNames, setSelectedStoreNames] = useState<Record<string, string>>({});

  // Debounced store search
  useEffect(() => {
    if (!open || scopeType !== 'stores') return;
    const timer = setTimeout(async () => {
      setStoreSearching(true);
      try {
        const res = await storesApi.list({ perPage: 20, search: storeSearch || undefined });
        setStoreResults(res.data.data.map((s: any) => ({ id: s.id, name: s.name })));
      } catch { /* ignore */ }
      setStoreSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [storeSearch, open, scopeType]);

  // Auto-set scope based on role
  useEffect(() => {
    if (roleTemplate === 'org_manager') setScopeType('org');
    else if (roleTemplate === 'zone_manager') setScopeType('zones');
    else if (roleTemplate === 'store_manager' || roleTemplate === 'surveyor') setScopeType('stores');
  }, [roleTemplate]);

  const reset = () => {
    setEmail('');
    setName('');
    setPhone('');
    setRoleTemplate('store_manager');
    setScopeType('stores');
    setSelectedStoreIds([]);
    setSelectedStoreNames({});
    setStoreSearch('');
    setStoreResults([]);
  };

  const canSubmit =
    email.trim().length > 0 &&
    name.trim().length > 0 &&
    roleTemplate &&
    (scopeType === 'org' || selectedStoreIds.length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await employeesApi.create({
        email: email.trim(),
        name: name.trim(),
        phone: phone || undefined,
        roleTemplate: roleTemplate as any,
        scopeType: scopeType as any,
        scopeEntityIds: scopeType !== 'org' ? selectedStoreIds : [],
      });
      toast.success(`Employee "${name}" invited`);
      reset();
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStore = (storeId: string, storeName: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId],
    );
    setSelectedStoreNames((prev) => ({ ...prev, [storeId]: storeName }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Invite Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <CustomInput.Text
            label="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="amit@example.com"
            type="email"
          />
          <CustomInput.Text
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Amit Kumar"
          />
          <CustomInput.Text
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
          />
          <CustomInput.Select
            label="Role *"
            value={roleTemplate}
            onChange={(e) => setRoleTemplate(e.target.value)}
            options={ROLE_OPTIONS}
          />
          <CustomInput.Select
            label="Data Scope *"
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value);
              setSelectedStoreIds([]);
            }}
            options={SCOPE_OPTIONS}
            disabled={roleTemplate === 'org_manager'}
          />
          {scopeType === 'stores' && (
            <div>
              <label className="mb-2 block text-[14px] font-medium leading-5 text-[#131313]">
                Assign to Stores
              </label>
              {/* Selected stores */}
              {selectedStoreIds.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedStoreIds.map((sid) => (
                    <span
                      key={sid}
                      className="flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs"
                    >
                      {selectedStoreNames[sid] || sid}
                      <button
                        type="button"
                        onClick={() => toggleStore(sid, '')}
                        className="ml-0.5 text-gray-500 hover:text-black"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Search input */}
              <input
                type="text"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Search stores by name..."
                className="mb-1 flex w-full rounded-none border bg-white px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400 hover:border-black focus:border-black focus:outline-none"
              />
              {/* Results */}
              <div className="max-h-40 overflow-y-auto border bg-white">
                {storeSearching ? (
                  <p className="p-3 text-center text-xs text-gray-400">Searching...</p>
                ) : storeResults.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400">
                    {storeSearch ? 'No stores found' : 'Type to search stores'}
                  </p>
                ) : (
                  storeResults.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => toggleStore(store.id, store.name)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                        selectedStoreIds.includes(store.id) ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                          selectedStoreIds.includes(store.id)
                            ? 'border-[#131313] bg-[#131313] text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedStoreIds.includes(store.id) && '✓'}
                      </span>
                      {store.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          {scopeType === 'zones' && (
            <div className="border bg-gray-50 p-3 text-sm text-gray-500">
              Zone assignment will be available once zones are created.
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-none"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Inviting...
              </>
            ) : (
              'Invite Employee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
