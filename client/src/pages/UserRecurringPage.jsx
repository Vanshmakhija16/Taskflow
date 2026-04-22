import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useUser } from '../api/users';
import { useRecurringTasks } from '../api/recurring';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import { PriorityBadge } from '../components/ui/Badge';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

const PRIORITY_COLOR = {
  low:    'border-l-slate-300',
  medium: 'border-l-blue-400',
  high:   'border-l-orange-400',
  urgent: 'border-l-red-500',
};

export default function UserRecurringPage() {
  const { id } = useParams();
  const { data: user, isLoading: userLoading } = useUser(id);
  const { data: tasks = [], isLoading: tasksLoading } = useRecurringTasks({ userId: id });

  const isLoading = userLoading || tasksLoading;

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const completedCount = tasks.filter(t => t.completed_today).length;
  const totalCount     = tasks.length;
  const allDone        = totalCount > 0 && completedCount === totalCount;

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
            <ArrowPathIcon className="w-5 h-5 text-violet-500 shrink-0" />
            {user?.full_name || user?.email || 'User'}'s Recurring Tasks
          </h1>
          <p className="text-xs text-slate-400">{today}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-5">

          {/* Progress */}
          {totalCount > 0 && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Today's Progress
                </span>
                <span className={`font-bold tabular-nums ${allDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {completedCount} / {totalCount}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-violet-500'}`}
                  style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              {allDone && (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                  🎉 {user?.full_name?.split(' ')[0] || 'They'} completed everything today!
                </p>
              )}
            </div>
          )}

          {/* Task list — read-only, no toggle buttons */}
          {tasks.length === 0 ? (
            <div className="card text-center py-14 space-y-2">
              <ArrowPathIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No recurring tasks assigned to {user?.full_name || 'this user'}.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map(task => {
                const done = task.completed_today;
                return (
                  <div
                    key={task.id}
                    className={`
                      flex items-center gap-4 p-4 rounded-2xl border-l-4 border
                      bg-white dark:bg-[#1a1d27] transition-all
                      ${done
                        ? 'border-l-emerald-400 border-slate-100 dark:border-slate-800 opacity-80'
                        : `${PRIORITY_COLOR[task.priority] || 'border-l-slate-300'} border-slate-200 dark:border-slate-700`
                      }
                    `}
                  >
                    {/* Status icon — read-only */}
                    <div className="shrink-0">
                      {done
                        ? <CheckCircleSolid className="w-7 h-7 text-emerald-500" />
                        : <CheckCircleIcon  className="w-7 h-7 text-slate-200 dark:text-slate-700" />
                      }
                    </div>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:block">
                        <PriorityBadge priority={task.priority} />
                      </span>

                      {done ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <CheckCircleSolid className="w-3 h-3" />
                          Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          <ClockIcon className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
