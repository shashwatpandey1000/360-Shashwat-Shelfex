'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { orgApi, lookupsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CustomInput } from '@/components/common/input';
import { Loader2, Save, Settings } from 'lucide-react';
import PageLoader from '@/components/common/PageLoader';
import SectionCard from '@/components/common/SectionCard';
import InfoRow from '@/components/common/InfoRow';
import AddressSummary from '@/components/common/AddressSummary';
import PlacesAutocomplete, { AddressData } from '@/components/common/PlacesAutocomplete';

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  industryId: string | null;
  country: string;
  currency: string;
  timezone: string;
  defaultLanguage: string;
  logoUrl: string | null;
  website: string | null;
  hqAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;
  contactEmail: string;
  contactPhone: string | null;
  settings: Record<string, unknown>;
}

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('settings:write');

  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [hqAddress, setHqAddress] = useState<AddressData | null>(null);
  const [addressDisplay, setAddressDisplay] = useState('');

  useEffect(() => {
    Promise.all([orgApi.getSettings(), lookupsApi.getIndustries()])
      .then(([settingsRes, industriesRes]) => {
        const data = settingsRes.data as OrgSettings;
        setOrg(data);
        setName(data.name);
        setWebsite(data.website || '');
        setContactPhone(data.contactPhone || '');
        setCountry(data.country);
        setCurrency(data.currency);
        setTimezone(data.timezone);
        setIndustryId(data.industryId || '');
        if (data.hqAddress) {
          const addr = data.hqAddress as any;
          setHqAddress({
            street: addr.street || '',
            city: addr.city || '',
            state: addr.state || '',
            postalCode: addr.postalCode || '',
            country: addr.country || '',
            formattedAddress: addr.formattedAddress || '',
            lat: addr.lat || 0,
            lng: addr.lng || 0,
          });
          setAddressDisplay(
            addr.formattedAddress ||
              [addr.street, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', '),
          );
        }
        setIndustries(industriesRes.data);
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await orgApi.updateSettings({
        name,
        website: website || undefined,
        contactPhone: contactPhone || undefined,
        country,
        currency,
        timezone,
        industryId: industryId || undefined,
        hqAddress: hqAddress
          ? {
              street: hqAddress.street,
              city: hqAddress.city,
              state: hqAddress.state,
              postalCode: hqAddress.postalCode,
              country: hqAddress.country,
              formattedAddress: hqAddress.formattedAddress,
              lat: hqAddress.lat,
              lng: hqAddress.lng,
            }
          : undefined,
      });
      setOrg(res.data);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!org) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Failed to load organization settings.</p>
      </div>
    );
  }

  return (
    <section className="flex-1 overflow-scroll">
      <div className="flex h-max w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold uppercase">Settings</h1>
          <div className="flex w-max items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600">
            <Settings size={14} />
            <span className="font-mono font-light">{org.name}</span>
          </div>
        </div>
        {canEdit && (
          <Button
            size="sm"
            className="rounded-none text-xs hover:underline"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex h-full w-full flex-col px-8 py-4">
        {success && (
          <div className="mb-4 border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="max-w-2xl space-y-8">
          {/* Profile */}
          <div className="border bg-white p-6">
            <h2 className="mb-4 text-[14px] font-medium text-[#131313]">Profile</h2>
            <div className="space-y-4">
              <CustomInput.Text
                label="Organization Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
              />
              <div>
                <label className="mb-2 block text-[14px] font-medium leading-5 text-[#131313]">
                  Industry
                </label>
                <select
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                  disabled={!canEdit}
                  className="flex w-full rounded-none border bg-white px-3 py-2 text-[14px] text-gray-900 transition-all duration-200 hover:border-black focus:border-black focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select industry</option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </select>
              </div>
              <CustomInput.Text
                label="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!canEdit}
                placeholder="https://www.example.com"
              />
              <CustomInput.Text
                label="Contact Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!canEdit}
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          {/* Address */}
          <div className="border bg-white p-6">
            <h2 className="mb-4 text-[14px] font-medium text-[#131313]">Headquarters Address</h2>
            <div className="space-y-4">
              <PlacesAutocomplete
                label="Search Address"
                value={addressDisplay}
                placeholder="Search for HQ address..."
                disabled={!canEdit}
                onSelect={(addr) => {
                  setHqAddress(addr);
                  setAddressDisplay(addr.formattedAddress);
                }}
                onChange={(val) => setAddressDisplay(val)}
              />
              {hqAddress && hqAddress.city && (
                <div className="space-y-1 border bg-gray-50 p-3 text-sm text-gray-600">
                  {hqAddress.street && <div>{hqAddress.street}</div>}
                  <div>
                    {[hqAddress.city, hqAddress.state, hqAddress.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  <div className="font-mono text-xs text-gray-400">
                    {hqAddress.country}
                    {hqAddress.lat ? ` · ${hqAddress.lat.toFixed(5)}, ${hqAddress.lng.toFixed(5)}` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Regional */}
          <div className="border bg-white p-6">
            <h2 className="mb-4 text-[14px] font-medium text-[#131313]">Regional</h2>
            <div className="grid grid-cols-2 gap-4">
              <CustomInput.Text
                label="Currency (ISO 4217)"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={!canEdit}
                placeholder="INR"
              />
              <CustomInput.Text
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!canEdit}
                placeholder="Asia/Kolkata"
              />
            </div>
          </div>

          {/* Info */}
          <div className="border bg-gray-50 p-6">
            <h2 className="mb-4 text-[14px] font-medium text-gray-600">Info</h2>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Slug</span>
                <span className="font-mono font-light">{org.slug}</span>
              </div>
              <div className="flex justify-between">
                <span>Type</span>
                <span>{org.type === 'chain' ? 'Chain / Multi-Store' : 'Single Store'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="capitalize">{org.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Contact Email</span>
                <span>{org.contactEmail}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}