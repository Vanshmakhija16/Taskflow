import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import Avatar from '../ui/Avatar';
import {
  Squares2X2Icon,
  ViewColumnsIcon,
  CalendarDaysIcon,
  FolderIcon,
  UsersIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useLogout } from '../../api/auth';

const NAV = [
  { to: '/',          label: 'Dashboard', icon: Squares2X2Icon,  end: true },
  { to: '/board',     label: 'Board',     icon: ViewColumnsIcon },
  { to: '/calendar',  label: 'Calendar',  icon: CalendarDaysIcon },
  { to: '/recurring', label: 'Recurring', icon: ArrowPathIcon },
  { to: '/team',      label: 'Team',      icon: UsersIcon },
  // { to: '/projects',  label: 'Projects',  icon: FolderIcon },
  // { to: '/settings',  label: 'Settings',  icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout.mutate();
    navigate('/login');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 w-64 flex flex-col
      bg-white dark:bg-[#13151f]
      border-r border-slate-200 dark:border-slate-800
      transform transition-transform duration-200 ease-in-out
      lg:static lg:translate-x-0
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">TaskFlow</span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700
                     hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <ShieldCheckIcon className="w-5 h-5 shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                        hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg
                       text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
