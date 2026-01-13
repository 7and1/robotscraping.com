import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightElement, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs uppercase tracking-[0.3em] text-white/40 block"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border bg-black/50 px-4 py-3 text-white outline-none transition',
              'focus:border-neon/70 focus:ring-1 focus:ring-neon/30',
              'border-white/15',
              error && 'border-laser/50 focus:border-laser/70 focus:ring-laser/30',
              leftIcon && 'pl-12',
              rightElement && 'pr-12',
              className,
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={clsx(errorId, helperId)}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightElement}</div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-laser" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-xs text-white/50">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
