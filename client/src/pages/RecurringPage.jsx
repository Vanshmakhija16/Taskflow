import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useRecurringTasks,
  useCompleteToday,
  useUncompleteToday,
  useRecurringHistory,
} from '../api/recurring';
import { useUIStore } from '../store/uiStore';
import Avatar from '../components/ui/Avatar';
import Spinner from '../components/ui/Spinner';
import { PriorityBadge } from '../components/ui/Badge';
import {
  ArrowPathIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarDaysIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

const PRIORITY_COLOR = {
  low:    'border-l-slate-300',
  medium: 'border-l-blue-400',
  high:   'border-l-orange-400',
  urgent: 'border-l-red-500',
};

/* ── History panel (per task) ─────────────────────────────────────────────── */
function HistoryPanel({ taskId }) {
  const { data: history = [], isLoading } = useRecurringHistory(taskId, 30);

  if (isLoading) {
    return (
      <div className="px-4 pb-4 flex justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="px-4 pb-4 text-xs text-slate-400 dark:text-slate-500 italic">
        No completions recorded yet. Mark it done today to start your streak!
      </p>
    );
  }

  // Build streak count (consecutive days ending today or yesterday)
  const dates = history.map(h => h.completion_date).sort((a, b) => b.localeCompare(a));
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let cursor  = today;
  for (const d of dates) {
    if (d === cursor) {
      streak++;
      // go to previous day
      const prev = new Date(cursor + 'T12:00:00');
      prev.setDate(prev.getDate() - 1);
      cursor = prev.toISOString().split('T')[0];
    } else {
      break;
    }
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Streak badge */}
      {streak > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 dark:text-orange-400">
          <FireIcon className="w-4 h-4" />
          {streak}-day streak 🔥
        </div>
      )}

      {/* Last 30 completions */}
      <div className="flex items-center gap-1 flex-wrap">
        {history.slice(0, 30).map(h => (
          <span
            key={h.completion_date}
            title={format(parseISO(h.completion_date), 'MMM d, yyyy')}
            className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400
                       bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800
                       px-2 py-0.5 rounded-lg"
          >
            <CheckCircleSolid className="w-3 h-3" />
            {format(parseISO(h.completion_date), 'MMM d')}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Task row ─────────────────────────────────────────────────────────────── */
function TaskRow({ task, onToggle, isPending }) {
  const [showHistory, setShowHistory] = useState(false);
  const done = task.completed_today;

  return (
    <div
      className={`
        rounded-2xl border-l-4 border
        bg-white dark:bg-[#1a1d27] transition-all
        ${done
          ? 'border-l-emerald-400 border-slate-100 dark:border-slate-800 opacity-80'
          : `${PRIORITY_COLOR[task.priority] || 'border-l-slate-300'} border-slate-200 dark:border-slate-700`
        }
      `}
    >
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        {/* Complete toggle */}
        <button
          onClick={() => onToggle(task)}
          disabled={isPending}
          className="shrink-0 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
          title={done ? 'Mark incomplete' : 'Mark complete for today'}
        >
          {done
            ? <CheckCircleSolid className="w-7 h-7 text-emerald-500" />
            : <CheckCircleIcon  className="w-7 h-7 text-slate-300 dark:text-slate-600 hover:text-violet-500 dark:hover:text-violet-400" />
          }
        </button>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate transition-colors ${done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <ArrowPathIcon className="w-3 h-3" />
              {task.recurrence_type ? task.recurrence_type.charAt(0).toUpperCase() + task.recurrence_type.slice(1) : 'Daily'}
            </span>
            {task.description && (
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                {task.description}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden sm:block">
            <PriorityBadge priority={task.priority} />
          </span>

          {task.assignees?.length > 0 && (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 3).map(a => (
                <Avatar key={a.id} user={a} size="xs" className="ring-2 ring-white dark:ring-[#1a1d27]" />
              ))}
              {task.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-[#1a1d27] flex items-center justify-center">
                  <span className="text-[9px] font-bold text-slate-500">+{task.assignees.length - 3}</span>
                </div>
              )}
            </div>
          )}

          {done ? (
            <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircleSolid className="w-3 h-3" />
              Done
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <ClockIcon className="w-3 h-3" />
              Pending
            </span>
          )}

          {/* History toggle */}
          <button
            onClick={() => setShowHistory(h => !h)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
            title="View completion history"
          >
            {showHistory
              ? <ChevronUpIcon   className="w-4 h-4" />
              : <CalendarDaysIcon className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* History panel (collapsible) */}
      {showHistory && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <HistoryPanel taskId={task.id} />
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function RecurringPage() {
  const { openCreateTask } = useUIStore();
  const { data: tasks = [], isLoading } = useRecurringTasks();
  const completeToday   = useCompleteToday();
  const uncompleteToday = useUncompleteToday();

  const today          = format(new Date(), 'EEEE, MMMM d, yyyy');
  const completedCount = tasks.filter(t => t.completed_today).length;
  const totalCount     = tasks.length;
  const allDone        = totalCount > 0 && completedCount === totalCount;
  const isPending      = completeToday.isPending || uncompleteToday.isPending;

  const toggleComplete = (task) => {
    if (task.completed_today) {
      uncompleteToday.mutate(task.id);
    } else {
      completeToday.mutate(task.id);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowPathIcon className="w-6 h-6 text-violet-500" />
            Recurring Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{today}</p>
        </div>
        <button
          onClick={() => openCreateTask()}
          className="btn-sm btn-primary flex items-center gap-1.5 shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Add Recurring</span>
        </button>
      </div>

      {/* Progress bar */}
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
              🎉 All done for today!
            </p>
          )}
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-14 space-y-3">
          <ArrowPathIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No recurring tasks yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Create a task and check "Repeats daily" to add it here.
          </p>
          <button
            onClick={() => openCreateTask()}
            className="btn-sm btn-primary inline-flex items-center gap-1.5 mt-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add your first recurring task
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={toggleComplete}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <p className="text-xs text-center text-slate-400 dark:text-slate-600 pb-2">
          Completions reset every day at midnight · Click the calendar icon on any task to see history
        </p>
      )}
    </div>
  );
}
