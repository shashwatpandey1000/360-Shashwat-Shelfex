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
      <span className="text-gray-500">{label}</span>
      <span className={mono ? 'font-mono text-xs text-gray-600' : 'text-gray-800'}>{value}</span>
    </div>
  );
}
