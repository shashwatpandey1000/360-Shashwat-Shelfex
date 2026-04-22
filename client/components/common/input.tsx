'use client';

import * as React from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneInput, validatePhone } from '@/lib/phone';

interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const inputBaseStyles = (hasError: boolean) =>
  cn(
    'flex w-full px-3 py-2 text-[14px] rounded-none',
    'bg-surface text-gray-900 placeholder:text-gray-400',
    'dark:bg-surface-muted dark:text-gray-100 dark:placeholder:text-gray-500',
    'border transition-all duration-200',
    hasError
      ? 'border-red-500'
      : 'border-gray-300 dark:border-gray-800 hover:border-brand focus:border-brand',
    'focus:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
  );

const labelStyles = 'mb-2 block text-[14px] leading-5 font-medium text-brand';
const errorStyles = 'mt-1 text-xs text-red-500';

const TextInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ className, containerClassName, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn('relative w-full', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(inputBaseStyles(!!error), className)}
          {...props}
        />
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  },
);
TextInput.displayName = 'CustomInput.Text';

const PasswordInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ className, containerClassName, label, error, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn('relative w-full', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            className={cn(inputBaseStyles(!!error), className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="group absolute top-0 right-0 flex aspect-square h-full cursor-pointer items-center justify-center hover:bg-[#2b2b2b]"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-black group-hover:text-white" />
            ) : (
              <Eye className="h-4 w-4 text-black group-hover:text-white" />
            )}
          </button>
        </div>
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  },
);
PasswordInput.displayName = 'CustomInput.Password';

interface CheckboxProps extends Omit<BaseInputProps, 'value' | 'label'> {
  label: React.ReactNode;
}

const CheckboxInput = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, containerClassName, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn('flex flex-col', containerClassName)}>
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              'h-4 w-4 cursor-pointer rounded-none border-gray-300 text-black focus:ring-black',
              className,
            )}
            {...props}
          />
          <label htmlFor={inputId} className="text-brand cursor-pointer text-[14px] select-none">
            {label}
          </label>
        </div>
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  },
);
CheckboxInput.displayName = 'CustomInput.Checkbox';

interface SelectInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
  id?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
}

const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ className, containerClassName, label, error, id, options, placeholder, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn('relative w-full', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(inputBaseStyles(!!error), 'appearance-none pr-10', className)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 dark:text-gray-400"
          />
        </div>
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  },
);
SelectInput.displayName = 'CustomInput.Select';

interface OptionGroupProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; description?: string }[];
  error?: string;
  containerClassName?: string;
  columns?: number;
  id?: string;
}

const OptionGroupInput = React.forwardRef<HTMLDivElement, OptionGroupProps>(
  ({ label, value, onChange, options, error, containerClassName, columns, id }, ref) => {
    const cols = columns ?? options.length;
    return (
      <div ref={ref} className={cn('relative w-full', containerClassName)}>
        {label && (
          <label htmlFor={id} className={labelStyles}>
            {label}
          </label>
        )}
        <div
          className={cn(
            'grid border',
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-800',
          )}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {options.map((opt, i) => {
            const selected = value === opt.value;
            const row = Math.floor(i / cols);
            const lastRow = Math.floor((options.length - 1) / cols);
            const isLastInRow = (i + 1) % cols === 0 || i === options.length - 1;
            const isInLastRow = row === lastRow;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'cursor-pointer px-4 py-3 text-left text-sm transition-colors',
                  !isLastInRow && 'border-r border-gray-300 dark:border-gray-800',
                  !isInLastRow && 'border-b border-gray-300 dark:border-gray-800',
                  selected
                    ? 'bg-brand-purple dark:bg-brand-purple text-white dark:text-white'
                    : 'bg-surface dark:bg-surface-muted text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-[#1a1a1a]',
                )}
              >
                <span className="block text-[13px] font-medium">{opt.label}</span>
                {opt.description && (
                  <span
                    className={cn(
                      'mt-0.5 block text-[12px]',
                      selected
                        ? 'text-gray-300 dark:text-white'
                        : 'text-gray-500 dark:text-gray-500',
                    )}
                  >
                    {opt.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  },
);
OptionGroupInput.displayName = 'CustomInput.OptionGroup';

interface PhoneInputProps
  extends Omit<BaseInputProps, 'onChange' | 'value' | 'type' | 'onBlur'> {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (error: string | null) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onValidate, error, placeholder, ...rest }, ref) => (
    <TextInput
      ref={ref}
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder ?? '+91 98765 43210'}
      value={value}
      error={error}
      onChange={(e) => {
        onChange(formatPhoneInput(e.target.value));
        if (error && onValidate) onValidate(null);
      }}
      onBlur={() => {
        onValidate?.(validatePhone(value));
      }}
    />
  ),
);
PhoneInput.displayName = 'CustomInput.Phone';

const CustomInput = {
  Text: TextInput,
  Password: PasswordInput,
  Checkbox: CheckboxInput,
  Select: SelectInput,
  OptionGroup: OptionGroupInput,
  Phone: PhoneInput,
};

export { CustomInput };
