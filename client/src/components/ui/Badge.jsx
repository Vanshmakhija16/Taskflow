// Status values used by the DB: pending, working, completed, blocked
// Legacy values kept for backwards compat: todo, in_progress, in_review, done, cancelled
const STATUS_MAP = {
  // ── Active values ──
  pending:     { label: 'Pending',     cls: 'badge-pending'   },
  working:     { label: 'Working',     cls: 'badge-working'   },
  completed:   { label: 'Completed',   cls: 'badge-completed' },
  blocked:     { label: 'Blocked',     cls: 'badge-blocked'   },
  // ── Legacy aliases ──
  todo:        { label: 'To Do',       cls: 'badge-pending'   },
  in_progress: { label: 'In Progress', cls: 'badge-working'   },
  in_review:   { label: 'In Review',   cls: 'badge-working'   },
  done:        { label: 'Done',        cls: 'badge-completed' },
  cancelled:   { label: 'Cancelled',   cls: 'badge-blocked'   },
};

const PRIORITY_MAP = {
  low:    { label: 'Low',    cls: 'badge-low',    dot: 'bg-slate-400' },
  medium: { label: 'Medium', cls: 'badge-medium', dot: 'bg-blue-500' },
  high:   { label: 'High',   cls: 'badge-high',   dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', cls: 'badge-urgent', dot: 'bg-red-500' },
};

const ROLE_MAP = {
  admin:    { label: 'Admin',    cls: 'badge-admin'    },
  manager:  { label: 'Manager',  cls: 'badge-manager'  },
  member:   { label: 'Member',   cls: 'badge-member'   },
  employee: { label: 'Employee', cls: 'badge-member'   },
};

export function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status ?? '—', cls: 'badge-pending' };
  return <span className={config.cls}>{config.label}</span>;
}

export function PriorityBadge({ priority }) {
  const config = PRIORITY_MAP[priority] || { label: priority ?? '—', cls: 'badge-low', dot: 'bg-slate-400' };
  return (
    <span className={config.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const config = ROLE_MAP[role] || { label: role ?? '—', cls: 'badge-member' };
  return <span className={config.cls}>{config.label}</span>;
}
