import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTask, useDeleteTask, useArchiveTask, useReopenTask, useUpdateLocationCounts,
} from '../api/tasks';
import { useUIStore } from '../store/uiStore';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import CommentThread from '../components/tasks/CommentThread';
import { isOverdue } from '../lib/utils';
import {
  PencilIcon, TrashIcon, ArchiveBoxIcon, ArrowPathIcon,
  ArrowLeftIcon, CalendarIcon, UserIcon,
} from '@heroicons/react/24/outline';
import { MapPin, Users, Send, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

function formatLocalDate(str) {
  if (!str) return null;
  const datePart = str.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openEditTask } = useUIStore();

  const { data: task, isLoading } = useTask(id);
  const deleteTask  = useDeleteTask();
  const archiveTask = useArchiveTask();
  const reopenTask  = useReopenTask();

  if (isLoading) return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
  if (!task)     return <div className="p-8 text-center text-slate-400">Task not found.</div>;

  async function handleDelete() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    await deleteTask.mutateAsync(id);
    navigate(-1);
  }

  const isDone    = task.status === 'completed' || task.status === 'done' || task.status === 'cancelled';
  const overdue   = isOverdue(task.due_date, task.status);
  const isTrainer = task.category === 'trainer';

  const assignees   = Array.isArray(task.assignees) && task.assignees.length > 0
    ? task.assignees
    : task.assignee ? [task.assignee] : [];
  const assignedBy   = task.reporter || null;
  const assignedDate = task.assigned_by ? formatLocalDate(task.updated_at || task.created_at) : null;

  const trainerDetail = task.task_trainer_details?.[0] || null;
  const locations     = task.task_locations || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400
                     hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditTask(id)}>
            <PencilIcon className="w-4 h-4" /><span className="hidden sm:inline">Edit</span>
          </Button>
          {isDone ? (
            <Button variant="outline" size="sm" onClick={() => reopenTask.mutate(id)} loading={reopenTask.isPending}>
              <ArrowPathIcon className="w-4 h-4" /><span className="hidden sm:inline">Reopen</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => archiveTask.mutate(id)} loading={archiveTask.isPending}>
              <ArchiveBoxIcon className="w-4 h-4" /><span className="hidden sm:inline">Archive</span>
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteTask.isPending}>
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main card */}
      <div className="card space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
            {task.title}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5 pt-4
                        border-t border-slate-100 dark:border-slate-800">

          <MetaItem icon={UserIcon} label="Assigned To">
            {assignees.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {assignees.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <Avatar user={a} size="xs" />
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate">
                      {a.full_name || a.email}
                    </span>
                  </div>
                ))}
              </div>
            ) : <span className="text-sm text-slate-400">Unassigned</span>}
          </MetaItem>

          <MetaItem icon={CalendarIcon} label="Due Date">
            {task.due_date ? (
              <span className={`text-sm font-medium ${overdue ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                {formatLocalDate(task.due_date)}
                {overdue && <span className="ml-1 text-xs font-normal text-red-400">(overdue)</span>}
              </span>
            ) : <span className="text-sm text-slate-400">No date</span>}
          </MetaItem>

          <MetaItem icon={UserIcon} label="Assigned By">
            {assignedBy ? (
              <div className="flex items-center gap-2">
                <Avatar user={assignedBy} size="xs" />
                <span className="text-sm text-slate-800 dark:text-slate-200 truncate">
                  {assignedBy.full_name || assignedBy.email}
                </span>
              </div>
            ) : <span className="text-sm text-slate-400">—</span>}
          </MetaItem>

          {assignedDate && (
            <MetaItem icon={CalendarIcon} label="Assign Date">
              <span className="text-sm text-slate-800 dark:text-slate-200">{assignedDate}</span>
            </MetaItem>
          )}
        </div>
      </div>

      {/* Trainer Details card */}
      {isTrainer && trainerDetail && (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Company</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{trainerDetail.company_name}</p>
            </div>
            {trainerDetail.domain && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Domain</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{trainerDetail.domain}</p>
              </div>
            )}
            {trainerDetail.notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Notes</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{trainerDetail.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Training Locations card */}
      {isTrainer && locations.length > 0 && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <MapPin size={14} className="text-violet-500" />
            Training Locations
          </h2>
          <div className="space-y-3">
            {locations.map(loc => (
              <LocationRow key={loc.id} location={loc} taskId={id} />
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="card">
        <CommentThread taskId={id} />
      </div>
    </div>
  );
}

// ── Location row ──────────────────────────────────────────────────────────────
function LocationRow({ location, taskId }) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent]         = useState(location.trainers_sent     ?? 0);
  const [approved, setApproved] = useState(location.trainers_approved ?? 0);
  const updateCounts = useUpdateLocationCounts();

  const handleSave = () => {
    updateCounts.mutate({
      taskId,
      locationId: location.id,
      trainers_sent:     Number(sent),
      trainers_approved: Number(approved),
    });
  };

  const required = location.trainers_required ?? 1;

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-violet-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {location.location_name}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Required */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Users size={12} />
            <span>{required} req</span>
          </div>
          {/* Sent — just the number, no /required */}
          <div className="flex items-center gap-1.5 text-xs text-blue-500">
            <Send size={12} />
            <span className="font-semibold">{sent}</span>
            <span className="text-slate-400">sent</span>
          </div>
          {/* Approved — just the number */}
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <CheckCircle size={12} />
            <span className="font-semibold">{approved}</span>
            <span className="text-slate-400">approved</span>
          </div>
          {expanded
            ? <ChevronUp size={14} className="text-slate-400" />
            : <ChevronDown size={14} className="text-slate-400" />
          }
        </div>
      </div>

      {/* Expanded: just the number inputs, no progress bars */}
      {expanded && (
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
            <div>
              <label className="block text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5 uppercase tracking-wide">
                Profiles Sent
              </label>
              <input
                type="number" min={0} max={999}
                value={sent}
                onChange={e => setSent(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5 uppercase tracking-wide">
                Profiles Approved
              </label>
              <input
                type="number" min={0} max={999}
                value={approved}
                onChange={e => setApproved(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} loading={updateCounts.isPending}>
              Save Counts
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MetaItem ──────────────────────────────────────────────────────────────────
function MetaItem({ icon: Icon, label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
