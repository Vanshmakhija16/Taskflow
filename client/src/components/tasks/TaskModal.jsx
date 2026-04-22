/**
 * TaskModal — thin wrapper that bridges UIStore state into TaskForm.
 * Placed in AppLayout so it's always available globally.
 */
import { useUIStore } from '@/store/uiStore';
import { useTask }    from '@/api/tasks';
import TaskForm       from './TaskForm';
import Spinner        from '../ui/Spinner';

export default function TaskModal() {
  const { taskModalOpen, taskModalTaskId, closeTaskModal } = useUIStore();
  const isEdit = !!taskModalTaskId;

  const { data: task, isLoading } = useTask(taskModalTaskId);

  if (!taskModalOpen) return null;

  // Don't open the edit form until the task is loaded
  if (isEdit && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <TaskForm
      open={taskModalOpen}
      onClose={closeTaskModal}
      task={isEdit ? task : null}
    />
  );
}
