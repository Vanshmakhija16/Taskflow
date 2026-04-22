import { forwardRef } from 'react';

const base = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5';

export const Input = forwardRef(function Input(
  { label, error, className = '', ...props }, ref
) {
  return (
    <div className="w-full">
      {label && <label className={base}>{label}</label>}
      <input
        ref={ref}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, className = '', ...props }, ref
) {
  return (
    <div className="w-full">
      {label && <label className={base}>{label}</label>}
      <textarea
        ref={ref}
        className={`input resize-none ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, className = '', children, ...props }, ref
) {
  return (
    <div className="w-full">
      {label && <label className={base}>{label}</label>}
      <select
        ref={ref}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});
