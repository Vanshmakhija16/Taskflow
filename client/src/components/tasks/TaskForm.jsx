import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, MapPin, RefreshCw, ChevronDown, ChevronUp, User, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import { useCreateTask, useUpdateTask } from '../../api/tasks';
import { useUsers } from '../../api/users';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'general',  label: 'General' },
  { value: 'trainer',  label: 'Trainer' },
  { value: 'meeting',  label: 'Meeting' },
  { value: 'review',   label: 'Review' },
  { value: 'other',    label: 'Other' },
];

const STATUSES = [
  { value: 'pending',   label: 'Pending' },
  { value: 'working',   label: 'Working' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked',   label: 'Blocked' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
];

const defaultLocation = () => ({
  location_name:     '',
  trainers_required: 1,
  trainers_sent:     0,
  trainers_approved: 0,
});

function buildDefaults(task) {
  if (!task) {
    return {
      title: '', description: '', category: 'general',
      status: 'pending', priority: 'medium',
      start_date: '', due_date: '',
      assignee_ids: [],
      is_recurring: false,
      trainer_details: { company_name: '', domain: '', notes: '' },
      locations: [],
    };
  }
  return {
    title:        task.title        || '',
    description:  task.description  || '',
    category:     task.category     || 'general',
    status:       task.status       || 'pending',
    priority:     task.priority     || 'medium',
    start_date:   task.start_date   || '',
    due_date:     task.due_date     || '',
    assignee_ids: task.assignee_ids || [],
    is_recurring: task.is_recurring || false,
    trainer_details: {
      company_name: task.task_trainer_details?.[0]?.company_name || '',
      domain:       task.task_trainer_details?.[0]?.domain       || '',
      notes:        task.task_trainer_details?.[0]?.notes        || '',
    },
    locations: (task.task_locations || []).map(loc => ({
      id:                loc.id,
      location_name:     loc.location_name     || '',
      trainers_required: loc.trainers_required ?? 1,
      trainers_sent:     loc.trainers_sent     ?? 0,
      trainers_approved: loc.trainers_approved ?? 0,
    })),
  };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TaskForm({ open, onClose, task = null }) {
  const isEdit = !!task;
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const {
    register, handleSubmit, watch,
    setValue, getValues,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ defaultValues: buildDefaults(task) });

  const { fields: locationFields, append, remove } = useFieldArray({ control, name: 'locations' });

  const category    = watch('category');
  const isRecurring = watch('is_recurring');
  const isTrainer   = category === 'trainer';
  const startDate   = watch('start_date');
  const assigneeIds = watch('assignee_ids') || [];
  const todayISO    = new Date().toISOString().split('T')[0];

  // Fetch all users for the assignee picker
  const { data: allUsers = [] } = useUsers();

  const toggleAssignee = (userId) => {
    const current = getValues('assignee_ids') || [];
    if (current.includes(userId)) {
      setValue('assignee_ids', current.filter(id => id !== userId));
    } else {
      setValue('assignee_ids', [...current, userId]);
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      title:       data.title,
      description: data.description || undefined,
      category:    data.category,
      status:      data.status,
      priority:    data.priority,
      start_date:  data.is_recurring ? undefined : (data.start_date || undefined),
      due_date:    data.is_recurring ? undefined : (data.due_date   || undefined),
      assignee_ids: data.assignee_ids || [],
      is_recurring:    data.is_recurring,
      recurrence_type: data.is_recurring ? 'daily' : undefined,
    };

    if (isTrainer) {
      payload.trainer_details = {
        company_name: data.trainer_details.company_name,
        domain:       data.trainer_details.domain || undefined,
        notes:        data.trainer_details.notes  || undefined,
      };
      payload.locations = data.locations.map((loc, i) => ({
        id:                loc.id,
        location_name:     loc.location_name,
        trainers_required: Number(loc.trainers_required) || 1,
        trainers_sent:     Number(loc.trainers_sent)     || 0,
        trainers_approved: Number(loc.trainers_approved) || 0,
        position:          i,
      }));
    }

    if (isEdit) {
      await updateTask.mutateAsync({ id: task.id, ...payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? 'Edit Task' : 'Create New Task'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Core fields ── */}
        <Section label="Task Details">
          <Input
            label="Title *"
            placeholder="What needs to be done?"
            error={errors.title?.message}
            {...register('title', { required: 'Title is required', maxLength: { value: 200, message: 'Max 200 chars' } })}
          />

          <Textarea
            label="Description"
            placeholder="Add more context..."
            rows={3}
            {...register('description')}
          />

          <Select label="Category *" {...register('category', { required: true })}>
            {CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" {...register('status')}>
              {STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select label="Priority" {...register('priority')}>
              {PRIORITIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>

          {!isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date *"
                type="date"
                min={todayISO}
                error={errors.start_date?.message}
                {...register('start_date', {
                  required: !isRecurring ? 'Start date is required' : false,
                  validate: v => !v || v >= todayISO || 'Start date cannot be in the past',
                })}
              />
              <Input
                label="Due Date *"
                type="date"
                min={startDate || todayISO}
                error={errors.due_date?.message}
                {...register('due_date', {
                  required: !isRecurring ? 'Due date is required' : false,
                  validate: v => !v || !startDate || v >= startDate || 'Due date must be after start date',
                })}
              />
            </div>
          )}
        </Section>

        {/* ── Assign To ── */}
        <Section label="Assign To">
          {allUsers.length === 0 ? (
            <p className="text-sm text-slate-400">No users available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {allUsers.map(user => {
                const selected = assigneeIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleAssignee(user.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all',
                      selected
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <Avatar user={user} size="xs" />
                    <span className="text-xs font-medium truncate flex-1">
                      {user.full_name || user.email}
                    </span>
                    {selected && <Check size={12} className="shrink-0 text-violet-600" />}
                  </button>
                );
              })}
            </div>
          )}
          {assigneeIds.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              {assigneeIds.length} person{assigneeIds.length > 1 ? 's' : ''} assigned
            </p>
          )}
        </Section>

        {/* ── Recurring ── */}
        <Section label="Recurrence">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-violet-600"
              {...register('is_recurring')}
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <RefreshCw size={14} className="text-violet-500" />
              This is a recurring task (repeats daily)
            </span>
          </label>
          {isRecurring && (
            <p className="text-xs text-slate-400 pl-7 mt-1">
              Recurring tasks run on a daily basis with no fixed start or end date.
            </p>
          )}
        </Section>

        {/* ── Trainer-specific fields ── */}
        {isTrainer && (
          <>
            <Section label="Trainer Details">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Company Name *"
                  placeholder="Acme Corp"
                  error={errors.trainer_details?.company_name?.message}
                  {...register('trainer_details.company_name', {
                    required: isTrainer ? 'Company name is required' : false,
                  })}
                />
                <Input
                  label="Domain"
                  placeholder="e.g. Safety, Soft Skills"
                  {...register('trainer_details.domain')}
                />
              </div>
              <Textarea
                label="Notes"
                placeholder="Additional trainer notes..."
                rows={2}
                {...register('trainer_details.notes')}
              />
            </Section>

            {/* ── Locations ── */}
            <Section
              label="Training Locations"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => append(defaultLocation())}
                >
                  Add Location
                </Button>
              }
            >
              {locationFields.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">
                  No locations yet. Click "Add Location" to add training venues.
                </p>
              )}
              <div className="space-y-4">
                {locationFields.map((field, index) => (
                  <LocationCard
                    key={field.id}
                    index={index}
                    register={register}
                    errors={errors}
                    isEdit={isEdit}
                    onRemove={() => remove(index)}
                  />
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────
function LocationCard({ index, register, errors, isEdit, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <MapPin size={14} className="text-violet-500" />
          Location {index + 1}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setExpanded(e => !e)}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button type="button" onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 space-y-4">
          <Input
            label="Location Name *"
            placeholder="e.g. Mumbai Office"
            error={errors?.locations?.[index]?.location_name?.message}
            {...register(`locations.${index}.location_name`, { required: 'Location name is required' })}
          />

          <Input
            label="Trainers Required"
            type="number" min={1} max={50}
            {...register(`locations.${index}.trainers_required`, { valueAsNumber: true, min: { value: 1, message: 'Min 1' } })}
          />

          {/* Trainer sent/approved — always shown for trainer tasks (create & edit) */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
            <div>
              <label className="block text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5 uppercase tracking-wide">
                Profiles Sent
              </label>
              <input type="number" min={0} max={999} className="input w-full"
                {...register(`locations.${index}.trainers_sent`, { valueAsNumber: true, min: { value: 0, message: 'Min 0' } })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1.5 uppercase tracking-wide">
                Profiles Approved
              </label>
              <input type="number" min={0} max={999} className="input w-full"
                {...register(`locations.${index}.trainers_approved`, { valueAsNumber: true, min: { value: 0, message: 'Min 0' } })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, action, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}
