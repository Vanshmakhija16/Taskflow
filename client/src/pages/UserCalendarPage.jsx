import { useParams, Link } from 'react-router-dom';
import { useUser } from '../api/users';
import WeeklyCalendar from '../components/calendar/WeeklyCalendar';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import { ArrowLeftIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function UserCalendarPage() {
  const { id } = useParams();
  const { data: user, isLoading } = useUser(id);

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Spinner /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 dark:border-slate-800
                      bg-white dark:bg-[#13151f] flex items-center gap-3 shrink-0">
        <Link
          to={`/team/${id}`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white
                     hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>

        {user && <Avatar user={user} size="sm" />}

        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
            <CalendarDaysIcon className="w-5 h-5 text-violet-500 shrink-0" />
            {user?.full_name || user?.email || 'User'}'s Calendar
          </h1>
          {user?.email && (
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto">
        <WeeklyCalendar userId={id} />
      </div>
    </div>
  );
}
