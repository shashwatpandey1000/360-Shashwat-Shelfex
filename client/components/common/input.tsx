"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const inputBaseStyles = (hasError: boolean) =>
  cn(
    "flex w-full bg-white px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400",
    "border transition-all duration-200",
    "hover:border-black focus:outline-none focus:border-black",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "rounded-none",
    hasError ? "border-red-500" : ""
  );

const labelStyles = "mb-2 block text-[14px] leading-5 font-medium text-[#131313]";
const errorStyles = "mt-1 text-xs text-red-500";

const TextInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ className, containerClassName, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn("relative w-full", containerClassName)}>
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
  }
);
TextInput.displayName = "CustomInput.Text";

const PasswordInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ className, containerClassName, label, error, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn("relative w-full", containerClassName)}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? "text" : "password"}
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
  }
);
PasswordInput.displayName = "CustomInput.Password";

interface CheckboxProps extends Omit<BaseInputProps, "value" | "label"> {
  label: React.ReactNode;
}

const CheckboxInput = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, containerClassName, label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn("flex flex-col", containerClassName)}>
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              "h-4 w-4 cursor-pointer rounded-none border-gray-300 text-black focus:ring-black",
              className
            )}
            {...props}
          />
          <label
            htmlFor={inputId}
            className="cursor-pointer text-[14px] text-[#131313] select-none"
          >
            {label}
          </label>
        </div>
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  }
);
CheckboxInput.displayName = "CustomInput.Checkbox";

const CustomInput = {
  Text: TextInput,
  Password: PasswordInput,
  Checkbox: CheckboxInput,
};

export { CustomInput };
