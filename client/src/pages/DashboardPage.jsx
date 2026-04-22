import { Link } from 'react-router-dom';
import { useDashboardStats } from '../api/projects';
import { useTasks } from '../api/tasks';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { formatDate, isOverdue } from '../lib/utils';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { openCreateTask } = useUIStore();
  const { data: stats = {}, isLoading: statsLoading } = useDashboardStats();
  const { data: rawTasks, isLoading: tasksLoading } = useTasks({ limit: 8 });

  const tasks = Array.isArray(rawTasks) ? rawTasks : [];

  const statCards = [
    {
      label: 'Total Tasks',
      value: stats?.total_tasks ?? '0',
      icon: ClipboardDocumentListIcon,
      iconBg: 'bg-violet-50 dark:bg-violet-950/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Completed',
      value: stats?.done ?? '0',
      icon: CheckCircleIcon,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'In Progress',
      value: stats?.in_progress ?? '0',
      icon: ClockIcon,
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Overdue',
      value: stats?.overdue ?? '0',
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-red-50 dark:bg-red-950/40',
      iconColor: 'text-red-500 dark:text-red-400',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Good {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Here's what's on your plate today.
          </p>
        </div>
        <button
          onClick={openCreateTask}
          className="btn-sm btn-primary flex items-center gap-1.5 shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(card => (
          <div key={card.label} className="stat-card">
            <div className={`stat-icon ${card.iconBg}`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <div className="min-w-0">
              {statsLoading
                ? <Spinner size="sm" />
                : <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{card.value}</p>
              }
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* My tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">My Tasks</h2>
          <Link
            to="/board"
            className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline"
          >
            View all <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {tasksLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardDocumentListIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No tasks assigned to you.</p>
            <button
              onClick={openCreateTask}
              className="mt-3 btn-sm btn-primary inline-flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              Create your first task
            </button>
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
                             hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors group"
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
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {task.project.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:block">
                      <PriorityBadge priority={task.priority} />
                    </span>
                    <StatusBadge status={task.status} />
                    {task.due_date && (
                      <span className={`hidden md:block text-xs ${
                        overdue ? 'text-red-400 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'
                      }`}>
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
