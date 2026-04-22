'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CustomButton } from '@/components/common/button';

const ILLUSTRATION_URL =
  'https://res.cloudinary.com/dw0bwetr1/image/upload/v1776675374/illustration_s8uirt.avif';

interface ComingSoonProps {
  feature?: string;
  eta?: string;
  /** Use compact mode when rendering inside a tab or panel instead of a full page */
  compact?: boolean;
}

export default function ComingSoon({ feature, eta, compact }: ComingSoonProps) {
  const handleRetry = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  const label = feature ?? 'This page';
  const description =
    `${label} is still in development. We're building it carefully` +
    (eta ? ` and it'll land here around ${eta}.` : " and it'll land here soon.");

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-50 text-center">
        <div className="border-brand-purple/30 bg-brand-purple-soft dark:border-brand-purple/40 dark:bg-brand-purple-soft mb-4 inline-flex items-center gap-2 border px-2.5 py-1">
          <span className="bg-brand-purple h-1.5 w-1.5" />
          <span className="text-brand-purple text-[12px] font-medium tracking-[0.12em] uppercase">
            In development
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {label} <span className="text-brand-purple">coming soon.</span>
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface text-brand dark:bg-surface dark:text-brand relative flex min-h-[calc(100vh-55px)] w-full items-center overflow-hidden">
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-10 py-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col">
          <div className="border-brand-purple/30 bg-brand-purple-soft dark:border-brand-purple/40 dark:bg-brand-purple-soft mb-5 inline-flex w-fit items-center gap-2 border px-2.5 py-1">
            <span className="bg-brand-purple h-1.5 w-1.5" />
            <span className="text-brand-purple text-[12px] font-medium tracking-[0.12em] uppercase">
              In development
            </span>
          </div>

          <h1 className="mb-2 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-7xl">
            Coming soon.
            <br />
            <span className="text-brand-purple underline">We&apos;re on it.</span>
          </h1>

          <p className="mt-4 max-w-md text-[16px] text-gray-500 dark:text-gray-400">
            {description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CustomButton onClick={handleRetry}>Try again</CustomButton>
            <Link
              href="/dashboard"
              className="border-brand-purple text-brand-purple hover:bg-brand-purple inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border bg-transparent px-5 py-2.5 text-sm font-medium transition-colors hover:text-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="relative order-first flex items-center justify-center lg:order-last">
          <div className="relative aspect-square w-full max-w-md">
            <Image
              src={ILLUSTRATION_URL}
              alt=""
              fill
              sizes="(min-width: 1024px) 448px, 80vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
