import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import Spinner from '../ui/Spinner';

export default function KanbanColumn({ column, tasks, isLoading }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="kanban-column flex flex-col min-h-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {column.label}
          </h3>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 min-h-[120px] transition-colors duration-200 ${
          isOver
            ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-dashed border-primary-400'
            : 'bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <Spinner />
          </div>
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasks.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-8 select-none">
                  Drop tasks here
                </div>
              )}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
