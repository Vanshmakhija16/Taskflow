/**
 * TaskDetailDrawer — slide-in right panel showing full task info.
 * Used by the calendar so users don't navigate away.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, MapPin, ExternalLink, Users, RefreshCw, Calendar, Flag, User } from 'lucide-react';
import { useTask } from '../../api/tasks';
import { StatusBadge, PriorityBadge } from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function TaskDetailDrawer({ taskId, onClose }) {
  const { data: task, isLoading } = useTask(taskId);
  const drawerRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md z-50',
          'bg-white shadow-2xl border-l border-neutral-100',
          'flex flex-col overflow-hidden',
          'animate-slide-in-right'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
          <h3 className="font-semibold text-neutral-900 text-sm">Task Details</h3>
          <div className="flex items-center gap-2">
            <Link
              to={`/tasks/${taskId}`}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Open full page"
            >
              <ExternalLink size={15} />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {isLoading ? (
            <div className="flex justify-center pt-12"><Spinner /></div>
          ) : !task ? (
            <p className="text-neutral-400 text-center pt-12">Task not found</p>
          ) : (
            <>
              {/* Title + badges */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  {task.is_recurring && (
                    <span className="badge bg-purple-50 text-purple-600 border border-purple-200 text-[10px]">
                      <RefreshCw size={9} /> Recurring
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-neutral-900 leading-snug">{task.title}</h2>
                {task.description && (
                  <p className="text-sm text-neutral-600 whitespace-pre-wrap">{task.description}</p>
                )}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <MetaCell icon={User} label="Assigned To">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar user={task.assignee} size="xs" />
                      <span className="text-xs">{task.assignee.full_name || task.assignee.email}</span>
                    </div>
                  ) : <span className="text-neutral-400 text-xs">Unassigned</span>}
                </MetaCell>

                <MetaCell icon={User} label="Assigned By">
                  <span className="text-xs">{task.assigner?.full_name || '—'}</span>
                </MetaCell>

                <MetaCell icon={Calendar} label="Start Date">
                  <span className="text-xs">{formatDate(task.start_date)}</span>
                </MetaCell>
{/* 
                <MetaCell icon={Calendar} label="Due Date">
                  <span className="text-xs">{formatDate(task.due_date)}</span>
                </MetaCell> */}

                {task.is_recurring && (
                  <MetaCell icon={RefreshCw} label="Recurrence" className="col-span-2">
                    <span className="text-xs capitalize">
                      {task.recurrence_type}
                      {task.recurrence_end_date && ` until ${formatDate(task.recurrence_end_date)}`}
                    </span>
                  </MetaCell>
                )}
              </div>

              {/* Trainer-specific */}
              {task.category === 'trainer' && task.task_trainer_details?.[0] && (
                <div className="bg-neutral-50 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Trainer Info</p>
                  <div className="text-sm space-y-1">
                    <p><span className="text-neutral-400">Company:</span> {task.task_trainer_details[0].company_name}</p>
                    {task.task_trainer_details[0].domain && (
                      <p><span className="text-neutral-400">Domain:</span> {task.task_trainer_details[0].domain}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Locations */}
              {task.task_locations?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1">
                    <MapPin size={12} /> Training Locations
                  </p>
                  {task.task_locations.map(loc => {
                    const assignments = loc.task_location_assignments || [];
                    const filled      = assignments.length >= loc.trainers_required;
                    return (
                      <div key={loc.id} className="border border-neutral-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-neutral-800 flex items-center gap-1.5">
                            <MapPin size={13} className="text-primary-500" />
                            {loc.location_name}
                          </p>
                          <span className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                            filled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          )}>
                            {assignments.length}/{loc.trainers_required} trainers
                          </span>
                        </div>
                        {assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assignments.map(a => (
                              <div
                                key={a.id}
                                className="flex items-center gap-1 bg-white border border-neutral-100 rounded-full px-2 py-0.5"
                              >
                                <Avatar user={a.trainer} size="xs" />
                                <span className="text-[11px] text-neutral-700">
                                  {a.trainer?.full_name || a.trainer?.email || '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-400">No trainers assigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {task && (
          <div className="px-5 py-4 border-t border-neutral-100 shrink-0">
            <Link
              to={`/tasks/${taskId}`}
              className="btn-primary w-full justify-center text-sm"
            >
              Open Full Task
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}

function MetaCell({ icon: Icon, label, children, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[10px] text-neutral-400 uppercase tracking-wide flex items-center gap-1">
        <Icon size={10} /> {label}
      </p>
      {children}
    </div>
  );
}
