import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { useUpdateMe } from '../api/users';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import { useUIStore } from '../store/uiStore';
import { RoleBadge } from '../components/ui/Badge';
import toast from 'react-hot-toast';
import { SunIcon, MoonIcon, UserCircleIcon, PaintBrushIcon } from '@heroicons/react/24/outline';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card space-y-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
        <Icon className="w-5 h-5 text-violet-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const updateMe = useUpdateMe();
  const { darkMode, toggleDark } = useUIStore();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    defaultValues: { full_name: user?.full_name || '', email: user?.email || '' },
  });

  const onSubmit = async (data) => {
    await updateMe.mutateAsync(data);
    toast.success('Profile updated!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Settings</h1>

      {/* Profile */}
      <Section title="Profile" icon={UserCircleIcon}>
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{user?.full_name || user?.email}</p>
            <div className="mt-1"><RoleBadge role={user?.role} /></div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <Input
            label="Email address"
            type="email"
            error={errors.email?.message}
            {...register('email', { required: 'Email required' })}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!isDirty} loading={updateMe.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon={PaintBrushIcon}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Dark Mode</p>
            <p className="text-xs text-slate-400 mt-0.5">Switch between light and dark theme</p>
          </div>
          <button
            onClick={toggleDark}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus-visible:outline
                        focus-visible:outline-2 focus-visible:outline-violet-500
                        ${darkMode ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                              flex items-center justify-center ${darkMode ? 'translate-x-7' : 'translate-x-1'}`}>
              {darkMode
                ? <SunIcon className="w-2.5 h-2.5 text-violet-600" />
                : <MoonIcon className="w-2.5 h-2.5 text-slate-400" />
              }
            </span>
          </button>
        </div>
      </Section>
    </div>
  );
}
