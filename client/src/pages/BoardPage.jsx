import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import KanbanBoard from '../components/tasks/KanbanBoard';
import TaskFilters from '../components/tasks/TaskFilters';
import TaskModal from '../components/tasks/TaskModal';
import Button from '../components/ui/Button';
import { useTasks } from '../api/tasks';
import { useFilters } from '../hooks/useFilters';

export default function BoardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { filters, apiParams, setFilters } = useFilters();

  // Use apiParams (clean, no empty strings) for the actual API call
  const { data: tasks = [], isLoading } = useTasks(apiParams);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800
                      bg-white dark:bg-[#13151f] shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Board</h1>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>
        <TaskFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="min-w-max lg:min-w-0 lg:w-full h-full">
          <KanbanBoard tasks={tasks} isLoading={isLoading} />
        </div>
      </div>

      <TaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
