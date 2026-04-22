import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useNotifications, useMarkRead } from '../../api/notifications';
import Avatar from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import {
  Bars3Icon,
  BellIcon,
  SunIcon,
  MoonIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export default function Topbar() {
  const { sidebarOpen, toggleSidebar, darkMode, toggleDark } = useUIStore();
  const { user } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <header className="h-16 bg-white dark:bg-[#13151f] border-b border-slate-200 dark:border-slate-800
                        flex items-center gap-3 px-4 lg:px-6 shrink-0 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Search bar */}
      {/* <div className="flex-1 max-w-xs hidden sm:block">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="input py-2 pl-9 text-sm"
          />
        </div>
      </div> */}

      <div className="flex-1" />

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300
                   hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
      </button>

      {/* Notifications */}
      {/* <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300
                     hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <BellIcon className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-600 rounded-full ring-2 ring-white dark:ring-[#13151f]" />
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1d27] rounded-2xl
                          shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50
                          animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={() => markRead.mutate()}
                  className="text-xs text-violet-600 hover:underline font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">No notifications</p>
              ) : (
                notifications.slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0
                               ${!n.is_read ? 'bg-violet-50/50 dark:bg-violet-950/20' : ''}`}
                  >
                    <p className="text-sm text-slate-800 dark:text-slate-200">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div> */}

      {/* Avatar */}
      <Avatar user={user} size="sm" />
    </header>
  );
}
