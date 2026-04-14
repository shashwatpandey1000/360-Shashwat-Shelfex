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
        'border p-6',
        variant === 'muted' ? 'bg-gray-50' : 'bg-white',
        className,
      )}
    >
      <h2
        className={cn(
          'mb-4 text-[14px] font-medium',
          variant === 'muted' ? 'text-gray-600' : 'text-[#131313]',
        )}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
