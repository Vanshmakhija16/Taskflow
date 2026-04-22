import { forwardRef } from 'react';
import Spinner from './Spinner';

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  outline:   'btn-outline',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
};
const SIZES = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled = false, className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="xs" className="mr-1" />}
      {children}
    </button>
  );
});

export default Button;
