import { clsx } from 'clsx';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

// ── Class merger ──────────────────────────────────────────────────────────────
export const cn = (...args) => clsx(...args);

// ── Date helpers ──────────────────────────────────────────────────────────────
export const formatDate = (date) => {
  if (!date) return '—';
  // Parse as local date to avoid UTC timezone shift for yyyy-MM-dd strings
  const datePart = String(date).split('T')[0];
  const [y, m, day] = datePart.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  if (isToday(d))    return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d, yyyy');
};

export const timeAgo = (date) =>
  date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—';

// isOverdue: only true when due date is STRICTLY in the past (not today or future)
// and task is not completed. Uses local date parsing to avoid timezone shifts.
export const isOverdue = (dueDate, status) => {
  if (!dueDate || status === 'completed' || status === 'done' || status === 'cancelled') return false;
  // Parse as local date (no UTC shift)
  const datePart = String(dueDate).split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  const due = new Date(y, m - 1, d, 23, 59, 59, 999); // end of due day, local time
  return due < new Date();
};

// ── Status helpers ────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'badge-pending',   dot: 'bg-neutral-400' },
  working:   { label: 'Working',   color: 'badge-working',   dot: 'bg-blue-500'    },
  completed: { label: 'Completed', color: 'badge-completed', dot: 'bg-green-500'   },
  blocked:   { label: 'Blocked',   color: 'badge-blocked',   dot: 'bg-red-500'     },
};

export const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: 'badge-low',    icon: '↓' },
  medium: { label: 'Medium', color: 'badge-medium', icon: '→' },
  high:   { label: 'High',   color: 'badge-high',   icon: '↑' },
};

export const ROLE_CONFIG = {
  admin:    { label: 'Admin',    color: 'badge-admin'    },
  manager:  { label: 'Manager',  color: 'badge-manager'  },
  employee: { label: 'Employee', color: 'badge-employee' },
};

// ── Status transition rules ────────────────────────────────────────────────────
export const VALID_TRANSITIONS = {
  pending:   ['working', 'blocked'],
  working:   ['completed', 'blocked', 'pending'],
  blocked:   ['pending', 'working'],
  completed: [], // use reopen endpoint
};

// ── Truncate text ─────────────────────────────────────────────────────────────
export const truncate = (str, n = 80) =>
  str && str.length > n ? str.slice(0, n) + '…' : str;

// ── Get initials ──────────────────────────────────────────────────────────────
export const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

// ── Debounce ──────────────────────────────────────────────────────────────────
export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
