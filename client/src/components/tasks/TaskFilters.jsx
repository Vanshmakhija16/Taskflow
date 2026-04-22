import { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import { Select } from '../ui/Input';
import { useProjects } from '../../api/projects';
import { useUsers } from '../../api/users';

export default function TaskFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false);
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();

  const activeCount = Object.values(filters).filter(v => v && v !== '').length;

  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({ search: '', status: '', priority: '', project_id: '', assignee_id: '', overdue: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search || ''}
          onChange={e => update('search', e.target.value)}
          className="input pl-9 py-2 text-sm w-full"
        />
      </div>

      {/* Filter toggle */}
      <Button
        variant={open ? 'primary' : 'outline'}
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <FunnelIcon className="w-4 h-4 mr-1" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5">
            {activeCount}
          </span>
        )}
      </Button>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <XMarkIcon className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}

      {/* Expanded filters */}
      {open && (
        <div className="w-full flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-36">
            <Select
              label="Status"
              value={filters.status || ''}
              onChange={e => update('status', e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="working">Working</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </Select>
          </div>

          <div className="w-36">
            <Select
              label="Priority"
              value={filters.priority || ''}
              onChange={e => update('priority', e.target.value)}
            >
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>

          <div className="w-48">
            <Select
              label="Project"
              value={filters.project_id || ''}
              onChange={e => update('project_id', e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>

          <div className="w-48">
            <Select
              label="Assignee"
              value={filters.assignee_id || ''}
              onChange={e => update('assignee_id', e.target.value)}
            >
              <option value="">All members</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </Select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!filters.overdue}
                onChange={e => update('overdue', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Overdue only
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
