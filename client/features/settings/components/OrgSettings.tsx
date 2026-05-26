'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgSettingsQuery } from '../queries';
import { useUpdateOrgSettingsMutation } from '../mutations';
import { useIndustriesQuery } from '@/features/lookups';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { Loader2, Save, Settings } from 'lucide-react';
import PageLoader from '@/components/common/PageLoader';
import PlacesAutocomplete, { AddressData } from '@/components/common/PlacesAutocomplete';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'address', label: 'Headquarters Address' },
  { id: 'regional', label: 'Regional' },
  { id: 'theme', label: 'Theme' },
  { id: 'info', label: 'Info' },
] as const;

interface OrgSettingsData {
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

type ThemePreference = 'light' | 'dark' | 'system';

export function OrgSettings() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('settings:write');
  const { theme, setTheme } = useTheme();

  const { data: orgRes, isLoading: orgLoading } = useOrgSettingsQuery();
  const { data: industriesRes } = useIndustriesQuery();
  const updateMutation = useUpdateOrgSettingsMutation();

  const org = orgRes?.data as OrgSettingsData | undefined;
  const industries = industriesRes?.data ?? [];
  const loading = orgLoading;

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPhoneError, setContactPhoneError] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [industryId, setIndustryId] = useState('');
  const [hqAddress, setHqAddress] = useState<AddressData | null>(null);
  const [addressDisplay, setAddressDisplay] = useState('');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  const scrollRootRef = useRef<HTMLElement | null>(null);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const activeTheme = (theme as ThemePreference | undefined) || 'system';
    setThemePreference(activeTheme);
  }, [theme]);

  useEffect(() => {
    if (loading) return;
    const root = scrollRootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { root, rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    SECTIONS.forEach(({ id }) => {
      const el = root.querySelector(`#${id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = (id: string) => {
    const root = scrollRootRef.current;
    if (!root) return;
    const el = root.querySelector(`#${id}`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setWebsite(org.website || '');
    setContactPhone(org.contactPhone || '');
    setCountry(org.country);
    setCurrency(org.currency);
    setTimezone(org.timezone);
    setDefaultLanguage(org.defaultLanguage || 'en');
    setIndustryId(org.industryId || '');

    if (org.hqAddress) {
      const addr = org.hqAddress as any;
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
  }, [org]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    updateMutation.mutate(
      {
        name,
        website: website || undefined,
        contactPhone: contactPhone || undefined,
        country,
        currency,
        timezone,
        defaultLanguage,
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
      },
      {
        onSuccess: () => {
          setSuccess('Settings saved');
          setTimeout(() => setSuccess(''), 3000);
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || 'Failed to save settings');
        },
      },
    );
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
    <section ref={scrollRootRef} className="bg-surface text-brand flex-1 overflow-y-scroll">
      <div className="bg-surface sticky top-0 z-20 flex w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold uppercase">Settings</h1>
          <div className="flex w-max items-center gap-1.5 bg-gray-100 px-2.5 py-1.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <Settings size={14} />
            <span className="font-mono font-light">{org.name}</span>
          </div>
        </div>
        {canEdit && (
          <CustomButton size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
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
          </CustomButton>
        )}
      </div>

      <div className="flex w-full">
        <div className="flex-1 px-8 py-6">
          {success && (
            <div className="mb-4 border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-8">
            <SettingsCard id="profile" title="Profile">
              <div className="space-y-4">
                <CustomInput.Text
                  label="Organization Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                />
                <CustomInput.Select
                  label="Industry"
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Select industry"
                  options={industries.map((ind: { id: string; name: string }) => ({ value: ind.id, label: ind.name }))}
                />
                <CustomInput.Text
                  label="Website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://www.example.com"
                />
                <CustomInput.Phone
                  label="Contact Phone"
                  value={contactPhone}
                  onChange={setContactPhone}
                  onValidate={(err) => setContactPhoneError(err ?? '')}
                  error={contactPhoneError}
                  disabled={!canEdit}
                />
              </div>
            </SettingsCard>

            <SettingsCard id="address" title="Headquarters Address">
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
                  <div className="dark:bg-surface-muted space-y-1 border bg-gray-50 p-3 text-sm text-gray-600 dark:text-gray-400">
                    {hqAddress.street && <div>{hqAddress.street}</div>}
                    <div>
                      {[hqAddress.city, hqAddress.state, hqAddress.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                    <div className="font-mono text-xs text-gray-400 dark:text-gray-500">
                      {hqAddress.country}
                      {hqAddress.lat !== undefined && hqAddress.lat !== null
                        ? ` · ${hqAddress.lat.toFixed(5)}, ${hqAddress.lng.toFixed(5)}`
                        : ''}
                    </div>
                  </div>
                )}
              </div>
            </SettingsCard>

            <SettingsCard id="regional" title="Regional">
              <div className="grid grid-cols-2 gap-4">
                <CustomInput.Text
                  label="Country (ISO 3166-1)"
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  disabled={!canEdit}
                  placeholder="IN"
                  maxLength={2}
                />
                <CustomInput.Text
                  label="Currency (ISO 4217)"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  disabled={!canEdit}
                  placeholder="INR"
                  maxLength={3}
                />
                <CustomInput.Text
                  label="Timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Asia/Kolkata"
                />
                <CustomInput.Select
                  label="Default Language"
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  disabled={!canEdit}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'hi', label: 'Hindi' },
                  ]}
                />
              </div>
            </SettingsCard>

            <SettingsCard id="theme" title="Theme Preference">
              <div className="max-w-sm space-y-2">
                <CustomInput.Select
                  label="Display Theme"
                  value={themePreference}
                  onChange={(e) => {
                    const nextTheme = e.target.value as ThemePreference;
                    setThemePreference(nextTheme);
                    setTheme(nextTheme);
                  }}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'Device' },
                  ]}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Theme is saved per user in this browser using local storage.
                </p>
              </div>
            </SettingsCard>

            <SettingsCard id="info" title="Info" muted>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <InfoRow
                  label="Slug"
                  value={<span className="font-mono font-light">{org.slug}</span>}
                />
                <InfoRow
                  label="Type"
                  value={org.type === 'chain' ? 'Chain / Multi-Store' : 'Single Store'}
                />
                <InfoRow
                  label="Status"
                  value={<span className="capitalize">{org.status.replace('_', ' ')}</span>}
                />
                <InfoRow label="Contact Email" value={org.contactEmail} />
              </div>
            </SettingsCard>
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 self-start lg:sticky lg:top-[60px] lg:block">
          <div className="px-0 py-6">
            <div className="mb-3 pl-3 font-mono text-[11px] font-light text-gray-500 uppercase">
              On this page
            </div>
            <nav className="flex flex-col">
              {SECTIONS.map((section) => {
                const active = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'cursor-pointer border-l-2 py-1.5 pl-3 text-left text-[13px] transition-colors',
                      active
                        ? 'border-brand-purple text-brand-purple font-medium'
                        : 'hover:text-brand dark:hover:text-brand border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-800 dark:text-gray-400 dark:hover:border-gray-600',
                    )}
                  >
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SettingsCard({
  id,
  title,
  muted,
  children,
}: {
  id: string;
  title: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 border p-6 ${muted ? 'dark:bg-surface-muted bg-gray-50' : 'bg-surface'}`}
    >
      <h2
        className={`mb-4 text-[14px] font-medium ${muted ? 'text-gray-600 dark:text-gray-400' : 'text-brand'}`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
