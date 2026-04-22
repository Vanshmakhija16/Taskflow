import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUserTasks } from '../api/tasks';
import { useUser } from '../api/users';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import { formatDate, isOverdue } from '../lib/utils';
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function UserTasksPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useUser(id);
  const { data, isLoading: tasksLoading } = useUserTasks(id);

  // Support both {data: [...]} and plain array responses
  const tasks = Array.isArray(data) ? data : (data?.data || []);
  const isLoading = userLoading || tasksLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Spinner /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate('/team')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
                   hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Team
      </button>

      {/* User header */}
      {user && (
        <div className="card flex items-center gap-4 flex-wrap">
          <Avatar user={user} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {user.full_name || user.email}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5 capitalize">{user.role} · {user.email}</p>
          </div>
          {/* Calendar & Recurring buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/team/${id}/calendar`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                         bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400
                         border border-violet-200 dark:border-violet-800
                         hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
            >
              <CalendarDaysIcon className="w-3.5 h-3.5" />
              Calendar
            </Link>
            <Link
              to={`/team/${id}/recurring`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                         bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400
                         border border-emerald-200 dark:border-emerald-800
                         hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Recurring
            </Link>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="card">
        <h2 className="section-title mb-4">
          Assigned Tasks
          <span className="ml-2 text-sm font-semibold text-slate-400">({tasks.length})</span>
        </h2>

        {tasks.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardDocumentListIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No tasks assigned to this user.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map(task => {
              const overdue = isOverdue(task.due_date, task.status);
              return (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center gap-3 sm:gap-4 py-3 -mx-1 px-1 rounded-xl
                             hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate transition-colors
                                   group-hover:text-violet-600 dark:group-hover:text-violet-400
                                   ${overdue
                                     ? 'text-red-500 dark:text-red-400'
                                     : 'text-slate-800 dark:text-slate-100'}`}>
                      {task.title}
                    </p>
                    {task.project && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{task.project.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:block"><PriorityBadge priority={task.priority} /></span>
                    <StatusBadge status={task.status} />
                    {task.due_date && (
                      <span className={`hidden md:block text-xs ${overdue ? 'text-red-400' : 'text-slate-400'}`}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
