'use client';

import { cn } from '@/lib/utils';

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}

export default function InfoRow({ label, value, mono = false, className }: InfoRowProps) {
  return (
    <div className={cn('flex justify-between', className)}>
      <span className="text-gray-500 text-[13px] dark:text-gray-400">{label}</span>
      <span
        className={
          mono
            ? 'font-mono text-[13px] text-gray-600 dark:text-gray-400'
            : 'text-gray-800 dark:text-gray-200'
        }
      >
        {value}
      </span>
    </div>
  );
}
