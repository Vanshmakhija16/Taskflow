import { getInitials } from '../../lib/utils';

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

const COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500',  'bg-rose-500', 'bg-indigo-500',
];

export default function Avatar({ user, size = 'md', className = '' }) {
  const initials = getInitials(user?.full_name || user?.email || '?');
  const color = COLORS[(user?.email?.charCodeAt(0) || 0) % COLORS.length];

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name || user.email}
        className={`${SIZES[size]} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZES[size]} ${color} rounded-full flex items-center justify-center
                  text-white font-semibold shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}
