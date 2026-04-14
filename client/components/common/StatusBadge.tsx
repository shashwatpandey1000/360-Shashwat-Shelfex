'use client';

import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[#c4ffdf] text-black',
  pending_tour: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-gray-200 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-[#c4ffdf] text-black',
  missed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-200 text-gray-600',
  published: 'bg-[#c4ffdf] text-black',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'px-2.5 py-1 text-xs',
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600',
        className,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
