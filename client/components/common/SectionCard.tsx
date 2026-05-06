'use client';

import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  variant?: 'default' | 'muted';
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({
  title,
  variant = 'default',
  children,
  className,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 p-6 dark:border-gray-800',
        variant === 'muted' ? 'bg-gray-50 dark:bg-neutral-800' : 'bg-surface',
        className,
      )}
    >
      <h2
        className={cn(
          'mb-4 text-[14px] font-medium',
          variant === 'muted' ? 'text-gray-600 dark:text-gray-400' : 'text-brand',
        )}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
