'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useIndustriesQuery } from '@/hooks/queries/useLookupQueries';
import { useRegisterOrgMutation } from '@/hooks/mutations/useOrgMutations';
import { CustomInput } from '@/components/common/input';
import { CustomButton } from '@/components/common/button';
import { validatePhone } from '@/lib/phone';
import PlacesAutocomplete, { AddressData } from '@/components/common/PlacesAutocomplete';
import { UserAvatar } from '@/components/common/user-avatar';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { VerticalStepRail } from './components/StepRail';
import { toast } from 'sonner';
import Loader from '@/components/common/utility/loader';

interface Industry {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const { user, accessMap, isLoading, needsOnboarding, refreshUser } = useAuth();
  const router = useRouter();

  const { data: industriesRes } = useIndustriesQuery();
  const industries = (industriesRes?.data ?? []) as Industry[];
  const registerMutation = useRegisterOrgMutation();

  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<'chain' | 'single_store'>('single_store');
  const [industryId, setIndustryId] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPhoneError, setContactPhoneError] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !industryId) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const phoneError = validatePhone(contactPhone);
    if (phoneError) {
      setContactPhoneError(phoneError);
      toast.error('Please enter a valid contact phone number.');
      return;
    }

    registerMutation.mutate(
      {
        orgName: orgName.trim(),
        orgType,
        industryId,
        website: website.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        hqAddress: hqAddress || undefined,
      },
      {
        onSuccess: async () => {
          await refreshUser();
          router.replace('/onboarding/pending');
        },
        onError: (err: unknown) => {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Registration failed. Please try again.';
          toast.error(message);
        },
      },
    );
  };

  if (isLoading || !needsOnboarding) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#010101]">
        <Loader />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-screen w-full flex-col bg-white dark:bg-[#0a0a0a]"
    >
      <header className="fixed top-0 left-0 z-50 flex h-14 w-full shrink-0 items-stretch justify-between bg-white px-6 dark:bg-[#0a0a0a]">
        <div className="flex items-center">
          <span className="text-sm font-semibold tracking-[0.2em] text-[#131313] dark:text-white">
            LOGO
          </span>
        </div>
        <div className="flex items-stretch">
          <ThemeToggle />
          <UserAvatar />
        </div>
      </header>

      <div className="relative flex flex-1 overflow-y-auto">
        <div className="absolute top-0 bottom-0 left-0 hidden w-64 items-center justify-center lg:flex">
          <VerticalStepRail currentStep="details" />
        </div>

        <div className="flex-1 overflow-y-auto pt-18 pb-10">
          <div className="mx-auto max-w-2xl px-8 py-10">
            <header className="mb-10 border-b border-gray-200 pb-6 dark:border-gray-800">
              <div className="inline-flex items-center gap-2 border border-gray-200 bg-white px-2.5 py-1 dark:border-gray-800 dark:bg-[#131313]">
                <span className="h-1.5 w-1.5 bg-[#131313] dark:bg-white" />
                <span className="text-[11px] font-medium tracking-[0.12em] text-[#131313] uppercase dark:text-white">
                  Step 1 of 3
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#131313] dark:text-white">
                Register your organization
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Signed in as <span className="text-[#131313] dark:text-white">{user?.email}</span>.
                Fields marked with an asterisk are required.
              </p>
            </header>

            <div className="space-y-10">
              <Section title="Organization" hint="Basic information about your business.">
                <CustomInput.Text
                  label="Organization name *"
                  placeholder="e.g. Acme Retail"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />

                <CustomInput.OptionGroup
                  label="Organization type *"
                  value={orgType}
                  onChange={(v) => setOrgType(v as 'chain' | 'single_store')}
                  options={[
                    {
                      value: 'single_store',
                      label: 'Single store',
                      description: 'One storefront or location.',
                    },
                    {
                      value: 'chain',
                      label: 'Chain',
                      description: 'Multiple locations.',
                    },
                  ]}
                />

                <CustomInput.Select
                  label="Industry *"
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                  options={industries.map((ind) => ({ value: ind.id, label: ind.name }))}
                  placeholder="Select an industry"
                />
              </Section>

              <Section title="Contact" hint="Optional. Used by support to reach you.">
                <PlacesAutocomplete
                  label="HQ address"
                  placeholder="Search for your office address..."
                  value={hqAddress?.formattedAddress}
                  onSelect={setHqAddress}
                />
                <CustomInput.Text
                  label="Website"
                  placeholder="https://example.com"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                <CustomInput.Phone
                  label="Contact phone"
                  value={contactPhone}
                  onChange={setContactPhone}
                  onValidate={(err) => setContactPhoneError(err ?? '')}
                  error={contactPhoneError}
                />
              </Section>
            </div>
          </div>
        </div>
      </div>

      <footer className="flex h-16 shrink-0 items-center justify-end border-t border-gray-200 px-8 dark:border-gray-800">
        <CustomButton type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Submitting…' : 'Submit for review'}
        </CustomButton>
      </footer>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 border-b border-gray-200 pb-3 dark:border-gray-800">
        <h2 className="text-[11px] font-medium tracking-[0.12em] text-gray-500 uppercase dark:text-gray-400">
          {title}
        </h2>
        {hint && <p className="mt-1 text-[12px] text-gray-400 dark:text-gray-500">{hint}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
