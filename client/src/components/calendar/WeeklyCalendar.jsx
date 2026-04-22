import { useState } from 'react';
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, format, isToday,
} from 'date-fns';
import { useCalendar } from '../../api/tasks';
import Spinner from '../ui/Spinner';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const PRIORITY_DOT = {
  low:    'bg-slate-400',
  medium: 'bg-blue-500',
  high:   'bg-orange-500',
  urgent: 'bg-red-500',
};

function parseLocalDate(str) {
  if (!str) return null;
  const datePart = str.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function isDateInRange(day, startDate, endDate) {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return d >= s && d <= e;
}

function getTaskStartDate(task) {
  return parseLocalDate(task.start_date)
    || parseLocalDate(task.created_at)
    || parseLocalDate(task.due_date);
}

function taskBelongsToDay(task, day) {
  const dueDate = parseLocalDate(task.due_date);
  if (dueDate) {
    const startDate = getTaskStartDate(task);
    if (!startDate) return false;
    return isDateInRange(day, startDate, dueDate);
  }
  const singleDate = parseLocalDate(task.start_date) || parseLocalDate(task.created_at);
  if (!singleDate) return false;
  return isSameLocalDay(singleDate, day);
}

function dateLabel(task, day) {
  const dueDate = parseLocalDate(task.due_date);
  if (dueDate) {
    if (isSameLocalDay(dueDate, day)) return '🏁 due';
    return null;
  }
  if (task.start_date) return '▶ start';
  return '✦ created';
}

/**
 * WeeklyCalendar
 * @param {string} [userId] — if provided, fetches tasks for that specific user
 */
export default function WeeklyCalendar({ userId } = {}) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days    = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Pass userId to useCalendar — backend will filter by that user
  const { data: tasks = [], isLoading } = useCalendar({
    start:   format(weekStart, 'yyyy-MM-dd'),
    end:     format(weekEnd,   'yyyy-MM-dd'),
    user_id: userId || undefined,
  });

  const tasksForDay = (day) => {
    const seen = new Set();
    return tasks.filter(t => {
      if (seen.has(t.id)) return false;
      if (!taskBelongsToDay(t, day)) return false;
      seen.add(t.id);
      return true;
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setWeekStart(w => subWeeks(w, 1))}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700
                     hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[170px] text-center">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>

        <button
          onClick={() => setWeekStart(w => addWeeks(w, 1))}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700
                     hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200
                     dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800
                     text-slate-600 dark:text-slate-400 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {days.map(day => {
            const dayTasks = tasksForDay(day);
            const today    = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`
                  flex flex-col min-h-[140px] rounded-2xl border p-3 gap-2
                  bg-white dark:bg-[#1a1d27]
                  ${today
                    ? 'border-violet-500 dark:border-violet-500 ring-1 ring-violet-400/30'
                    : 'border-slate-200 dark:border-slate-800'}
                `}
              >
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {format(day, 'EEE')}
                  </span>
                  <span className={`
                    text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                    ${today ? 'bg-violet-600 text-white' : 'text-slate-700 dark:text-slate-300'}
                  `}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-slate-300 dark:text-slate-700 text-center mt-3 select-none">—</p>
                  ) : (
                    dayTasks.map(task => {
                      const label = dateLabel(task, day);
                      const isDueDay = task.due_date && isSameLocalDay(parseLocalDate(task.due_date), day);
                      return (
                        <Link
                          key={task.id}
                          to={`/tasks/${task.id}`}
                          className={`group flex flex-col gap-0.5 p-1.5 rounded-lg border transition-colors
                                     ${isDueDay
                                       ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 hover:border-red-400'
                                       : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-300 dark:hover:border-violet-700'
                                     }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-slate-400'}`} />
                            <span className={`text-xs line-clamp-2 transition-colors leading-snug
                                             ${isDueDay
                                               ? 'text-red-700 dark:text-red-400'
                                               : 'text-slate-700 dark:text-slate-300 group-hover:text-violet-700 dark:group-hover:text-violet-400'
                                             }`}>
                              {task.title}
                            </span>
                          </div>
                          {label && (
                            <span className={`text-[9px] font-semibold pl-3 ${isDueDay ? 'text-red-400 dark:text-red-500' : 'text-slate-400 dark:text-slate-600'}`}>
                              {label}
                            </span>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>

                {dayTasks.length > 0 && (
                  <span className="self-end text-[10px] font-semibold text-slate-400 dark:text-slate-600 shrink-0">
                    {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
