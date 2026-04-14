'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { storesApi } from '@/lib/api/stores.api';
import { lookupsApi } from '@/lib/api/lookups.api';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import PlacesAutocomplete, { AddressData } from '@/components/common/PlacesAutocomplete';
import AddressSummary from '@/components/common/AddressSummary';
import StatusBadge from '@/components/common/StatusBadge';
import SectionCard from '@/components/common/SectionCard';
import InfoRow from '@/components/common/InfoRow';
import PageLoader from '@/components/common/PageLoader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, MapPin, Save, Trash2 } from 'lucide-react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/google-maps';

interface StoreDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: any;
  location: any;
  timezone: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  categoryId: string | null;
  managerId: string | null;
  operatingHours: any;
  logoUrl: string | null;
  zoneId: string | null;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

const TABS = ['Overview', 'Surveys', 'Employees'] as const;

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('stores:write');
  const canDelete = hasPermission('stores:delete');

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview');
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState<AddressData | null>(null);
  const [addressDisplay, setAddressDisplay] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const { isLoaded: mapsLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const fetchStore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storesApi.getById(id as string);
      const data = res.data;
      setStore(data);
      populateEditForm(data);
    } catch {
      toast.error('Store not found');
      router.push('/dashboard/stores');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const populateEditForm = (data: StoreDetail) => {
    setEditName(data.name);
    setEditCategoryId(data.categoryId || '');
    setEditTimezone(data.timezone || '');
    setEditPhone(data.contactPhone || '');
    setEditEmail(data.contactEmail || '');
    const addr = data.address;
    if (addr) {
      setEditAddress({
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.postalCode || '',
        country: addr.country || '',
        formattedAddress: addr.formattedAddress || '',
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0,
      });
      setAddressDisplay(
        addr.formattedAddress ||
          [addr.street, addr.city, addr.state].filter(Boolean).join(', '),
      );
    }
  };

  useEffect(() => {
    fetchStore();
    lookupsApi.getStoreCategories().then((res) => setCategories(res.data));
  }, [fetchStore]);

  const handleSave = async () => {
    if (!store) return;
    setSaving(true);
    try {
      const res = await storesApi.update(store.id, {
        name: editName,
        categoryId: editCategoryId || undefined,
        timezone: editTimezone || undefined,
        contactPhone: editPhone || undefined,
        contactEmail: editEmail || undefined,
        address: editAddress
          ? {
              street: editAddress.street || undefined,
              city: editAddress.city,
              state: editAddress.state || undefined,
              postalCode: editAddress.postalCode || undefined,
              country: editAddress.country || undefined,
              formattedAddress: editAddress.formattedAddress || undefined,
            }
          : undefined,
        location: editAddress?.lat
          ? { latitude: editAddress.lat, longitude: editAddress.lng }
          : undefined,
      });
      setStore(res.data);
      populateEditForm(res.data);
      setEditing(false);
      toast.success('Store updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update store');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!store) return;
    try {
      await storesApi.deactivate(store.id);
      toast.success('Store deactivated');
      fetchStore();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  if (loading) return <PageLoader />;

  if (!store) return null;

  const addr = store.address;
  const loc = store.location;
  const hasLocation = loc?.latitude && loc?.longitude;
  const category = categories.find((c) => c.id === store.categoryId);

  return (
    <section className="flex-1 overflow-scroll">
      {/* Header */}
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-none px-2"
            onClick={() => router.push('/dashboard/stores')}
          >
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-xl font-semibold uppercase">{store.name}</h1>
          <StatusBadge status={store.status} />
          <span
            onClick={() => {
              navigator.clipboard.writeText(store.slug);
              toast.success(`Copied: ${store.slug}`);
            }}
            className="cursor-pointer font-mono text-xs text-gray-400 hover:underline"
          >
            /{store.slug}
          </span>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <Button
              size="sm"
              className="rounded-none text-xs hover:underline"
              onClick={() => setEditing(true)}
            >
              Edit Store
            </Button>
          )}
          {canEdit && editing && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs"
                onClick={() => {
                  setEditing(false);
                  populateEditForm(store);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-none text-xs hover:underline"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
          {canDelete && store.status !== 'inactive' && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-none border text-xs text-red-600 hover:bg-red-50 hover:underline"
              onClick={handleDeactivate}
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-[#131313] font-medium text-[#131313]'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-8 py-6">
        {activeTab === 'Overview' && (
          <div className="flex gap-8">
            {/* Left — Store info */}
            <div className="flex-1 space-y-6">
              {editing ? (
                // Edit mode
                <div className="max-w-lg space-y-6">
                  <SectionCard title="Store Details">
                    <div className="space-y-4">
                      <CustomInput.Text
                        label="Store Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <CustomInput.Select
                        label="Category"
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        placeholder="Select category"
                        options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      />
                      <CustomInput.Text
                        label="Timezone"
                        value={editTimezone}
                        onChange={(e) => setEditTimezone(e.target.value)}
                        placeholder="Asia/Kolkata"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <CustomInput.Text
                          label="Phone"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                        <CustomInput.Text
                          label="Email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </SectionCard>
                  <SectionCard title="Address">
                    <div className="space-y-4">
                      <PlacesAutocomplete
                        label="Search Address"
                        value={addressDisplay}
                        onSelect={(a) => {
                          setEditAddress(a);
                          setAddressDisplay(a.formattedAddress);
                        }}
                        onChange={(v) => setAddressDisplay(v)}
                      />
                      {editAddress && <AddressSummary address={editAddress} />}
                    </div>
                  </SectionCard>
                </div>
              ) : (
                // View mode
                <div className="max-w-lg space-y-6">
                  <SectionCard title="Store Details">
                    <div className="space-y-3 text-sm">
                      <InfoRow label="Name" value={store.name} />
                      <InfoRow label="Category" value={category?.name || '—'} />
                      <InfoRow label="Status" value={store.status.replace('_', ' ')} />
                      <InfoRow label="Timezone" value={store.timezone || '—'} />
                      <InfoRow label="Phone" value={store.contactPhone || '—'} />
                      <InfoRow label="Email" value={store.contactEmail || '—'} />
                      <InfoRow label="Manager" value={store.managerId ? store.managerId : 'Not assigned'} />
                    </div>
                  </SectionCard>
                  <SectionCard title="Address">
                    <div className="space-y-1 text-sm text-gray-700">
                      {addr?.street && <div>{addr.street}</div>}
                      <div>
                        {[addr?.city, addr?.state, addr?.postalCode].filter(Boolean).join(', ')}
                      </div>
                      {addr?.country && <div className="text-gray-500">{addr.country}</div>}
                      {addr?.formattedAddress && (
                        <div className="mt-2 text-xs text-gray-400">{addr.formattedAddress}</div>
                      )}
                    </div>
                  </SectionCard>
                  <SectionCard title="Info" variant="muted">
                    <div className="space-y-2 text-sm text-gray-500">
                      <InfoRow label="ID" value={store.id} mono />
                      <InfoRow label="Slug" value={store.slug} mono />
                      <InfoRow label="Created" value={new Date(store.createdAt).toLocaleDateString()} />
                      <InfoRow label="Updated" value={new Date(store.updatedAt).toLocaleDateString()} />
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>

            {/* Right — Map */}
            {hasLocation && mapsLoaded && !editing && (
              <div className="hidden w-80 shrink-0 lg:block">
                <div className="border bg-white p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={12} />
                    <span>Store Location</span>
                  </div>
                  <div className="h-64 w-full">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: Number(loc.latitude), lng: Number(loc.longitude) }}
                      zoom={15}
                      options={{
                        disableDefaultUI: true,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                      }}
                    >
                      <MarkerF
                        position={{ lat: Number(loc.latitude), lng: Number(loc.longitude) }}
                        title={store.name}
                      />
                    </GoogleMap>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Surveys' && (
          <EmptyState message="Surveys for this store will appear here." />
        )}

        {activeTab === 'Employees' && (
          <EmptyState message="Store manager and surveyors will appear here." />
        )}
      </div>
    </section>
  );
}


