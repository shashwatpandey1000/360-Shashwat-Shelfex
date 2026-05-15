'use client';

import { useEffect, useState } from 'react';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { useAuth } from '@/contexts/auth-context';
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
import { useCreateEmployeeMutation } from '@/hooks/mutations/useEmployeeMutations';
import { useStoresQuery } from '@/hooks/queries/useStoreQueries';

const ALL_ROLE_OPTIONS = [
  { value: 'org_manager', label: 'Organization Manager', minRole: 'org_manager' },
  { value: 'zone_manager', label: 'Zone Manager', minRole: 'org_manager' },
  { value: 'store_manager', label: 'Store Manager', minRole: 'zone_manager' },
  { value: 'surveyor', label: 'Surveyor', minRole: 'zone_manager' },
];

// Roles each caller level may create
const CREATABLE_ROLES: Record<string, string[]> = {
  org_manager: ['org_manager', 'zone_manager', 'store_manager', 'surveyor'],
  zone_manager: ['store_manager', 'surveyor'],
  store_manager: ['surveyor'],
  surveyor: [],
};

// Scope options each caller level may grant
// store_manager can only grant stores scope (within their own stores)
// zone_manager can grant zones or stores scope (within their zones)
// org_manager can grant any scope
const GRANTABLE_SCOPES: Record<string, string[]> = {
  org_manager: ['org', 'zones', 'stores'],
  zone_manager: ['zones', 'stores'],
  store_manager: ['stores'],
  surveyor: [],
};

const ALL_SCOPE_OPTIONS = [
  { value: 'org', label: 'Entire Organization' },
  { value: 'zones', label: 'Specific Zones' },
  { value: 'stores', label: 'Specific Stores' },
];

interface AddEmployeeDialogProps {
  onCreated?: () => void;
  trigger: React.ReactNode;
}

export default function AddEmployeeDialog({ onCreated, trigger }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const { accessMap } = useAuth();

  // Filter role and scope options based on the caller's role
  const callerRole = accessMap?.roleTemplate ?? 'surveyor';
  const allowedRoles = CREATABLE_ROLES[callerRole] ?? [];
  const roleOptions = ALL_ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value));
  const grantableScopes = GRANTABLE_SCOPES[callerRole] ?? [];
  const scopeOptions = ALL_SCOPE_OPTIONS.filter((s) => grantableScopes.includes(s.value));

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [roleTemplate, setRoleTemplate] = useState(allowedRoles[0] ?? 'surveyor');
  const [scopeType, setScopeType] = useState('stores');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // Searchable store picker
  const [storeSearch, setStoreSearch] = useState('');
  const [debouncedStoreSearch, setDebouncedStoreSearch] = useState('');
  // Cache selected store names so they show even when search changes
  const [selectedStoreNames, setSelectedStoreNames] = useState<Record<string, string>>({});

  // Debounce the store search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStoreSearch(storeSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [storeSearch]);

  // TanStack Query for store search — only active when the dialog is open and scope is 'stores'
  const { data: storeQueryData, isFetching: storeSearching } = useStoresQuery({
    perPage: 20,
    search: debouncedStoreSearch || undefined,
  });
  const storeResultsEnabled = open && scopeType === 'stores';
  const storeResults: { id: string; name: string }[] = storeResultsEnabled
    ? (storeQueryData?.data?.data ?? []).map((s: any) => ({ id: s.id, name: s.name }))
    : [];

  const createMutation = useCreateEmployeeMutation();

  // Auto-set scope based on role
  useEffect(() => {
    if (roleTemplate === 'org_manager') setScopeType('org');
    else if (roleTemplate === 'zone_manager') setScopeType('zones');
    else if (roleTemplate === 'store_manager' || roleTemplate === 'surveyor')
      setScopeType('stores');
  }, [roleTemplate]);

  const reset = () => {
    setEmail('');
    setName('');
    setPhone('');
    setPhoneError('');
    setRoleTemplate('store_manager');
    setScopeType('stores');
    setSelectedStoreIds([]);
    setSelectedStoreNames({});
    setStoreSearch('');
    setDebouncedStoreSearch('');
  };

  const canSubmit =
    email.trim().length > 0 &&
    name.trim().length > 0 &&
    roleTemplate &&
    (scopeType === 'org' || selectedStoreIds.length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    createMutation.mutate(
      {
        email: email.trim(),
        name: name.trim(),
        phone: phone || undefined,
        roleTemplate: roleTemplate as any,
        scopeType: scopeType as any,
        scopeEntityIds: scopeType !== 'org' ? selectedStoreIds : [],
      },
      {
        onSuccess: () => {
          toast.success(`Employee "${name}" invited`);
          reset();
          setOpen(false);
          onCreated?.();
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || 'Failed to create employee');
        },
      },
    );
  };

  const toggleStore = (storeId: string, storeName: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId],
    );
    setSelectedStoreNames((prev) => ({ ...prev, [storeId]: storeName }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
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
          <CustomInput.Phone
            label="Phone"
            value={phone}
            onChange={setPhone}
            onValidate={(err) => setPhoneError(err ?? '')}
            error={phoneError}
          />
          <CustomInput.Select
            label="Role *"
            value={roleTemplate}
            onChange={(e) => setRoleTemplate(e.target.value)}
            options={roleOptions}
          />
          <CustomInput.Select
            label="Data Scope *"
            value={scopeType}
            onChange={(e) => {
              setScopeType(e.target.value);
              setSelectedStoreIds([]);
            }}
            options={scopeOptions}
            disabled={scopeOptions.length === 1}
          />
          {scopeType === 'stores' && (
            <div>
              <label className="text-brand mb-2 block text-[14px] leading-5 font-medium">
                Assign to Stores
              </label>
              {/* Selected stores */}
              {selectedStoreIds.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedStoreIds.map((sid) => (
                    <span
                      key={sid}
                      className="flex items-center gap-1 bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-neutral-800 dark:text-gray-200"
                    >
                      {selectedStoreNames[sid] || sid}
                      <button
                        type="button"
                        onClick={() => toggleStore(sid, '')}
                        className="hover:text-brand ml-0.5 text-gray-500 dark:hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Search input */}
              <CustomInput.Text
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Search stores by name..."
                autoComplete="off"
                containerClassName="mb-1"
              />
              {/* Results — only render while the user is searching */}
              {storeSearch && (
                <div className="bg-surface dark:bg-surface-muted max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-800">
                  {storeSearching ? (
                    <p className="p-3 text-center text-xs text-gray-400 dark:text-gray-500">
                      Searching...
                    </p>
                  ) : storeResults.length === 0 ? (
                    <p className="p-3 text-sm text-gray-400 dark:text-gray-500">No stores found.</p>
                  ) : (
                    storeResults.map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => toggleStore(store.id, store.name)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-800 ${
                          selectedStoreIds.includes(store.id)
                            ? 'bg-gray-50 font-medium dark:bg-neutral-800/60'
                            : ''
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                            selectedStoreIds.includes(store.id)
                              ? 'border-brand-purple bg-brand-purple text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {selectedStoreIds.includes(store.id) && '✓'}
                        </span>
                        {store.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {scopeType === 'zones' && (
            <div className="border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-neutral-800 dark:text-gray-400">
              Zone assignment will be available once zones are created.
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <CustomButton variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </CustomButton>
          <CustomButton
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Inviting...
              </>
            ) : (
              'Invite Employee'
            )}
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
