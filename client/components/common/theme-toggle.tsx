'use client';

import * as React from 'react';
import { Check, Moon, Monitor, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ThemeToggleProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
type ThemeOption = 'light' | 'dark' | 'system';

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const activeTheme = mounted ? (theme as ThemeOption | undefined) || 'system' : 'system';
  const displayIcon =
    mounted && activeTheme === 'system' ? Monitor : resolvedTheme === 'dark' ? Sun : Moon;

  const options: { value: ThemeOption; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Device' },
  ];

  const DisplayIcon = displayIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Theme options"
          className={cn('aspect-square h-full cursor-pointer p-2 focus:outline-none', className)}
          {...props}
        >
          <div
            className={cn(
              'flex h-full w-full items-center justify-center rounded-md border transition-colors',
              'border-gray-200 bg-white text-[#131313] hover:bg-gray-50',
              'dark:border-gray-800 dark:bg-[#131313] dark:text-white dark:hover:bg-[#1a1a1a]',
            )}
          >
            {mounted ? <DisplayIcon className="h-4 w-4" /> : <span className="h-4 w-4" />}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="-mt-1.5 mr-2 w-40 rounded-md">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-gray-500 uppercase">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className="flex cursor-pointer items-center justify-between rounded-md"
          >
            <span>{option.label}</span>
            {activeTheme === option.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
