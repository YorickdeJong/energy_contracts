"use client";

import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    const baseStyles =
      "appearance-none px-5 py-4 text-lg text-text-primary placeholder-text-tertiary bg-background-secondary transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary/20 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed";

    const stateStyles = error
      ? "focus:ring-error/20"
      : "";

    const widthStyles = fullWidth ? "w-full" : "";

    const combinedStyles = `${baseStyles} ${stateStyles} ${widthStyles} ${className}`;

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-base font-medium text-text-primary mb-2"
          >
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={combinedStyles} {...props} />
        {error && (
          <p className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
