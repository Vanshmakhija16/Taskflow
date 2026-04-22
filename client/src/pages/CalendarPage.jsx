import WeeklyCalendar from '../components/calendar/WeeklyCalendar';
import TaskModal from '../components/tasks/TaskModal';
import { useState } from 'react';
import Button from '../components/ui/Button';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function CalendarPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Page header bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 dark:border-slate-800
                      bg-white dark:bg-[#13151f] flex items-center justify-between shrink-0">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Calendar</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-y-auto">
        <WeeklyCalendar />
      </div>

      <TaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
