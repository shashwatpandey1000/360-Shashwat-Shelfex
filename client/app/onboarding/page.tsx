'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { orgApi } from '@/lib/api/org.api';
import { lookupsApi } from '@/lib/api/lookups.api';
import { CustomInput } from '@/components/common/input';
import PlacesAutocomplete, { AddressData } from '@/components/common/PlacesAutocomplete';
import { toast } from 'sonner';

interface Industry {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const { user, accessMap, isLoading, needsOnboarding, refreshUser } = useAuth();
  const router = useRouter();

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<'chain' | 'single_store'>('single_store');
  const [industryId, setIndustryId] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [hqAddress, setHqAddress] = useState<AddressData | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!needsOnboarding) {
      if (accessMap?.orgStatus === 'pending_approval') {
        router.replace('/onboarding/pending');
      } else if (accessMap?.orgStatus === 'rejected') {
        router.replace('/onboarding/rejected');
      } else if (accessMap?.orgStatus === 'active') {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, needsOnboarding, accessMap, router]);

  useEffect(() => {
    lookupsApi.getIndustries().then((res) => {
      setIndustries(res.data || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !industryId) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await orgApi.register({
        orgName: orgName.trim(),
        orgType,
        industryId,
        website: website.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        hqAddress: hqAddress || undefined,
      });
      await refreshUser();
      router.replace('/onboarding/pending');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !needsOnboarding) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#131313]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg border bg-white p-8">
        <h1 className="text-xl font-semibold text-[#131313]">Register Your Organization</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome, {user?.email}. Set up your organization to get started.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <CustomInput.Text
            label="Organization Name *"
            placeholder="e.g. Acme Retail"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />

          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#131313]">
              Organization Type *
            </label>
            <div className="flex gap-3">
              {(['single_store', 'chain'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrgType(t)}
                  className={`flex-1 border px-4 py-2 text-sm transition-colors ${
                    orgType === t
                      ? 'border-[#131313] bg-[#131313] text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-black'
                  }`}
                >
                  {t === 'single_store' ? 'Single Store' : 'Chain'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[14px] font-medium text-[#131313]">
              Industry *
            </label>
            <select
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
              required
              className="w-full border bg-white px-3 py-2 text-[14px] text-gray-900 transition-all hover:border-black focus:border-black focus:outline-none"
            >
              <option value="">Select an industry</option>
              {industries.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
          </div>

          <CustomInput.Text
            label="Website"
            placeholder="https://example.com"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          <CustomInput.Text
            label="Contact Phone"
            placeholder="+91 98765 43210"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />

          <PlacesAutocomplete
            label="HQ Address"
            placeholder="Search for your office address..."
            value={hqAddress?.formattedAddress}
            onSelect={setHqAddress}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#131313] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register Organization'}
          </button>
        </form>
      </div>
    </div>
  );
}