const SIZES = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <span className={`spinner ${SIZES[size]} ${className}`} />
  );
}
