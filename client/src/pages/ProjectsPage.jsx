import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ClipboardDocumentListIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useProjects, useCreateProject } from '../api/projects';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Textarea, Select } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { useForm } from 'react-hook-form';

const COLOR_OPTIONS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2',
];

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    await createProject.mutateAsync({ ...data, color: selectedColor });
    reset();
    setSelectedColor(COLOR_OPTIONS[0]);
    setModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Projects</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <PlusIcon className="w-4 h-4" />
          <span className="hidden sm:inline">New Project</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardDocumentListIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/board?project_id=${project.id}`}
              className="card hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700
                         hover:-translate-y-0.5 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0"
                  style={{ backgroundColor: project.color || '#7c3aed' }}
                >
                  {project.name[0].toUpperCase()}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  project.status === 'active'    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                  project.status === 'archived'  ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
                  project.status === 'completed' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                  'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                }`}>
                  {project.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-violet-600
                             dark:group-hover:text-violet-400 transition-colors mb-1">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5">
                  <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                  {project.task_count ?? 0} tasks
                </span>
                <span className="flex items-center gap-1.5">
                  <UsersIcon className="w-3.5 h-3.5" />
                  {project.member_count ?? 0} members
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Create New Project">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Project Name *"
            placeholder="My Awesome Project"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Textarea label="Description" placeholder="What is this project about?" rows={3} {...register('description')} />
          <Select label="Status" {...register('status')}>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-violet-500' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" type="button" size="sm" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" size="sm" loading={createProject.isPending}>Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
