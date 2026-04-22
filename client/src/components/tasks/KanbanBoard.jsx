import { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import TaskCard     from './TaskCard';
import { useMoveTask } from '../../api/tasks';

// ── Matches the DB enum exactly ───────────────────────────────────────────────
const COLUMNS = [
  { id: 'pending',   label: 'Pending',   color: 'bg-neutral-400' },
  { id: 'working',   label: 'Working',   color: 'bg-blue-500'    },
  { id: 'blocked',   label: 'Blocked',   color: 'bg-red-400'     },
  { id: 'completed', label: 'Completed', color: 'bg-green-500'   },
];

export default function KanbanBoard({ tasks = [], isLoading, filters = {} }) {
  const [activeTask, setActiveTask] = useState(null);
  const moveTask = useMoveTask();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByColumn = useCallback(() => {
    const map = {};
    COLUMNS.forEach(col => { map[col.id] = []; });
    tasks.forEach(task => {
      if (map[task.status]) map[task.status].push(task);
    });
    return map;
  }, [tasks])();

  function handleDragStart(event) {
    setActiveTask(tasks.find(t => t.id === event.active.id) || null);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const targetColumn =
      COLUMNS.find(c => c.id === over.id) ||
      COLUMNS.find(c => tasksByColumn[c.id]?.some(t => t.id === over.id));

    if (!targetColumn) return;
    const task = tasks.find(t => t.id === active.id);
    if (task && task.status !== targetColumn.id) {
      moveTask.mutate({ taskId: active.id, status: targetColumn.id });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            isLoading={isLoading}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
