'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import AddressSummary from '@/components/common/AddressSummary';
import { lookupsApi } from '@/lib/api/lookups.api';
import { storesApi } from '@/lib/api/stores.api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import PlacesAutocomplete, { AddressData } from '@/components/common/PlacesAutocomplete';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

interface StoreData {
  id: string;
  name: string;
  categoryId: string | null;
  timezone: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: any;
  location: any;
}

interface EditStoreDialogProps {
  store: StoreData;
  onUpdated: () => void;
  trigger: React.ReactNode;
}

export default function EditStoreDialog({ store, onUpdated, trigger }: EditStoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPhoneError, setContactPhoneError] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [addressDisplay, setAddressDisplay] = useState('');

  // Populate from store when dialog opens
  useEffect(() => {
    if (!open) return;
    setName(store.name);
    setCategoryId(store.categoryId || '');
    setTimezone(store.timezone || '');
    setContactPhone(store.contactPhone || '');
    setContactPhoneError('');
    setContactEmail(store.contactEmail || '');

    const addr = store.address;
    if (addr) {
      const ad: AddressData = {
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.postalCode || '',
        country: addr.country || '',
        formattedAddress: addr.formattedAddress || '',
        lat: store.location?.latitude || 0,
        lng: store.location?.longitude || 0,
      };
      setAddressData(ad);
      setAddressDisplay(addr.formattedAddress || [addr.street, addr.city, addr.state].filter(Boolean).join(', '));
    } else {
      setAddressData(null);
      setAddressDisplay('');
    }

    lookupsApi.getStoreCategories().then((res) => setCategories(res.data));
  }, [open, store]);

  const handlePhoneChange = (value: string) => {
    const formatted = new AsYouType().input(value);
    setContactPhone(formatted);
    if (!value.trim()) { setContactPhoneError(''); return; }
    if (!value.trim().startsWith('+')) {
      setContactPhoneError('Include country code, e.g. +91 98765 43210.');
    } else {
      const parsed = parsePhoneNumberFromString(value.trim());
      setContactPhoneError(parsed?.isValid() ? '' : 'Enter a valid international phone number.');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await storesApi.update(store.id, {
        name: name.trim(),
        categoryId: categoryId || undefined,
        timezone: timezone || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        address: addressData
          ? {
              street: addressData.street || undefined,
              city: addressData.city,
              state: addressData.state || undefined,
              postalCode: addressData.postalCode || undefined,
              country: addressData.country || undefined,
              formattedAddress: addressData.formattedAddress || undefined,
            }
          : undefined,
        location: addressData?.lat
          ? { latitude: addressData.lat, longitude: addressData.lng }
          : undefined,
      });
      toast.success('Store updated');
      setOpen(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update store');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Store</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <CustomInput.Text
            label="Store Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <CustomInput.Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="Select category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <PlacesAutocomplete
            label="Store Location"
            placeholder="Search for store address..."
            value={addressDisplay}
            onChange={(v) => setAddressDisplay(v)}
            onSelect={(addr) => {
              setAddressData(addr);
              setAddressDisplay(addr.formattedAddress);
            }}
          />
          {addressData && <AddressSummary address={addressData} />}
          <CustomInput.Text
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Kolkata"
          />
          <CustomInput.Text
            label="Phone"
            value={contactPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+91 98765 43210"
            error={contactPhoneError}
          />
          <CustomInput.Text
            label="Email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="store@example.com"
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-none"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
