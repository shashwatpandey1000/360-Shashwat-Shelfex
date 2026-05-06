'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-brand-purple text-white hover:bg-brand-purple-hover',
  secondary:
    'border border-gray-300 bg-surface text-brand hover:border-brand hover:bg-gray-50 dark:border-gray-700 dark:bg-surface-muted dark:hover:border-brand dark:hover:bg-[#1a1a1a]',
  ghost:
    'bg-transparent text-gray-500 hover:text-brand hover:underline dark:text-gray-400 dark:hover:text-brand',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-5 py-2.5 text-sm',
};

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  ),
);
CustomButton.displayName = 'CustomButton';

export { CustomButton };
