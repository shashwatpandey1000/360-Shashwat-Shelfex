'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none transition-colors duration-200',
        'data-checked:bg-brand-purple data-unchecked:bg-gray-200 dark:data-unchecked:bg-neutral-700',
        'focus-visible:ring-2 focus-visible:ring-brand-purple/50',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        'data-[size=default]:h-5 data-[size=default]:w-9',
        'data-[size=sm]:h-4 data-[size=sm]:w-7',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          'group-data-[size=default]/switch:size-3.5',
          'group-data-[size=sm]/switch:size-3',
          'group-data-[size=default]/switch:data-checked:translate-x-[18px]',
          'group-data-[size=sm]/switch:data-checked:translate-x-[14px]',
          'group-data-[size=default]/switch:data-unchecked:translate-x-[3px]',
          'group-data-[size=sm]/switch:data-unchecked:translate-x-[2px]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
