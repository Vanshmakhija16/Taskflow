import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { PriorityBadge } from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { formatDate, isOverdue } from '../../lib/utils';
import { CalendarIcon, ChatBubbleLeftIcon, PaperClipIcon } from '@heroicons/react/24/outline';

export default function TaskCard({ task, overlay = false }) {
  const navigate = useNavigate();
  const canMove = task._perms?.canChangeStatus ?? true;

  const sortable = useSortable({ id: task.id, disabled: !canMove });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(task.due_date, task.status);
  // Support both multi-assignee (task_assignees) and single joined assignee
  const assignees = task.task_assignees
    ? task.task_assignees.map(a => a.user).filter(Boolean)
    : task.assignee
    ? [task.assignee]
    : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canMove ? attributes : {})}
      {...(canMove ? listeners : {})}
      onClick={() => navigate(`/tasks/${task._original_id || task.id}`)}
      className={`task-card group ${canMove ? 'cursor-pointer' : 'cursor-default opacity-90'} ${overlay ? 'shadow-2xl rotate-2' : ''} ${isDragging ? 'z-50' : ''}`}
    >
      <div className={`h-1 rounded-t-xl -mt-4 -mx-4 mb-3 priority-${task.priority}`} />

      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">
          {task.title}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          {!canMove && (
            <LockClosedIcon className="w-3.5 h-3.5 text-gray-400" title="Read-only" />
          )}
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {task.project && (
        <span className="inline-block text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full mb-3">
          {task.project.name}
        </span>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {/* Only show due date on card when task is actually overdue */}
          {overdue && (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <CalendarIcon className="w-3.5 h-3.5" />
              Due {formatDate(task.due_date)}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
              {task.comment_count}
            </span>
          )}
          {task.attachment_count > 0 && (
            <span className="flex items-center gap-1">
              <PaperClipIcon className="w-3.5 h-3.5" />
              {task.attachment_count}
            </span>
          )}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map(u => (
              <Avatar key={u.id} user={u} size="xs" className="ring-2 ring-white dark:ring-gray-900" />
            ))}
            {assignees.length > 3 && (
              <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                +{assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
