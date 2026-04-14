'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message: string;
  className?: string;
}

export default function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={cn('flex min-h-[40vh] items-center justify-center', className)}>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
