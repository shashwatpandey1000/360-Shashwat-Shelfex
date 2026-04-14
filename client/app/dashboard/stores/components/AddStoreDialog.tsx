'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import AddressSummary from '@/components/common/AddressSummary';
import { lookupsApi } from '@/lib/api/lookups.api';
import { storesApi } from '@/lib/api/stores.api';
import { employeesApi } from '@/lib/api/employees.api';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import PlacesAutocomplete, { AddressData } from '@/components/common/PlacesAutocomplete';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AddStoreDialogProps {
  onCreated: () => void;
  trigger: React.ReactNode;
}

export default function AddStoreDialog({ onCreated, trigger }: AddStoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Store fields
  const [name, setName] = useState('');
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [timezone, setTimezone] = useState('');

  // Manager search (existing employees only)
  const [managerSearch, setManagerSearch] = useState('');
  const [managerResults, setManagerResults] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [selectedManager, setSelectedManager] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showManagerSearch, setShowManagerSearch] = useState(false);

  useEffect(() => {
    if (open) {
      lookupsApi.getStoreCategories().then((res) => setCategories(res.data));
    }
  }, [open]);

  // Debounced employee search
  useEffect(() => {
    if (!showManagerSearch || managerSearch.length < 2) {
      setManagerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await employeesApi.list({ perPage: 10, search: managerSearch });
        setManagerResults(res.data.data.map((e: any) => ({ id: e.id, name: e.name, email: e.email })));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [managerSearch, showManagerSearch]);

  const reset = () => {
    setName('');
    setAddressData(null);
    setCategoryId('');
    setContactPhone('');
    setContactEmail('');
    setTimezone('');
    setManagerSearch('');
    setManagerResults([]);
    setSelectedManager(null);
    setShowManagerSearch(false);
  };

  const canSubmit = name.trim().length >= 2 && !!addressData?.city;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const storeRes = await storesApi.create({
        name: name.trim(),
        address: {
          street: addressData?.street || undefined,
          city: addressData?.city || '',
          state: addressData?.state || undefined,
          postalCode: addressData?.postalCode || undefined,
          country: addressData?.country || undefined,
          formattedAddress: addressData?.formattedAddress || undefined,
        },
        location: addressData?.lat ? { latitude: addressData.lat, longitude: addressData.lng } : undefined,
        categoryId: categoryId || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        timezone: timezone || undefined,
      });

      // Assign manager if selected
      if (selectedManager) {
        try {
          await employeesApi.assignStoreManager(storeRes.data.id, selectedManager.id);
        } catch (err: any) {
          toast.error(`Store created but manager assignment failed: ${err.response?.data?.message || err.message}`);
        }
      }

      toast.success(`Store "${name}" created`);
      reset();
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Store</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <CustomInput.Text
            label="Store Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Haldiram's CP"
          />
          <CustomInput.Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="Select category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <PlacesAutocomplete
            label="Store Location *"
            placeholder="Search for store address..."
            onSelect={(addr) => setAddressData(addr)}
          />
          {addressData && <AddressSummary address={addressData} />}
          <CustomInput.Text
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Kolkata"
          />
          <div className="grid grid-cols-2 gap-4">
            <CustomInput.Text
              label="Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
            <CustomInput.Text
              label="Email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="store@example.com"
            />
          </div>

          {/* Manager — pick existing employee only */}
          <div>
            <label className="mb-2 block text-[14px] font-medium leading-5 text-[#131313]">
              Store Manager (optional)
            </label>
            {selectedManager ? (
              <div className="flex items-center justify-between border bg-gray-50 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{selectedManager.name}</span>
                  <span className="ml-2 text-gray-500">{selectedManager.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedManager(null)}
                  className="text-gray-400 hover:text-black"
                >
                  <X size={14} />
                </button>
              </div>
            ) : !showManagerSearch ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-none border px-3 py-1.5 text-xs text-gray-700 hover:border-black hover:bg-gray-200"
                onClick={() => setShowManagerSearch(true)}
              >
                Assign Existing Employee
              </Button>
            ) : (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    placeholder="Search employees by name or email..."
                    className="flex w-full rounded-none border bg-white px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400 hover:border-black focus:border-black focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowManagerSearch(false); setManagerSearch(''); setManagerResults([]); }}
                    className="text-gray-400 hover:text-black"
                  >
                    <X size={14} />
                  </button>
                </div>
                {managerResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border bg-white">
                    {managerResults.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedManager({ id: emp.id, name: emp.name || emp.email, email: emp.email });
                          setShowManagerSearch(false);
                          setManagerSearch('');
                          setManagerResults([]);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                      >
                        <span className="font-medium">{emp.name || emp.email}</span>
                        {emp.name && <span className="text-xs text-gray-400">{emp.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {managerSearch.length >= 2 && managerResults.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">No employees found. Create the employee first from the Employees page.</p>
                )}
              </div>
            )}
          </div>
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
                Creating...
              </>
            ) : (
              'Create Store'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}