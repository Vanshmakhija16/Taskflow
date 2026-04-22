import { useUsers } from '../api/users';
import { useAssignedByMe } from '../api/tasks';
import { useAuthStore } from '../store/authStore';
import Avatar from '../components/ui/Avatar';
import { RoleBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { UsersIcon } from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';

export default function TeamPage() {
  const { user: me } = useAuthStore();
  const { data: usersData, isLoading } = useUsers();
  const { data: assignedByMeData } = useAssignedByMe();
  const navigate = useNavigate();

  const users = usersData?.data || usersData || [];
  const byUser = assignedByMeData?.by_user || {};

  // Count active tasks assigned to each user
  const activeTaskCount = (userId) => {
    const entry = byUser[userId];
    if (!entry) return 0;
    return entry.tasks.filter(t => t.status !== 'completed').length;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-violet-500" />
          Team
        </h1>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
          {users.length} members
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <Link
              key={user.id}
              to={`/team/${user.id}`}
              className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all
                         hover:border-violet-300 dark:hover:border-violet-700"
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar user={user} size="md" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {user.full_name || 'Unnamed'}
                    {user.id === me?.id && (
                      <span className="text-xs font-normal text-slate-400 ml-1">(me)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <RoleBadge role={user.role} />
                <span className="text-xs text-slate-400">
                  {activeTaskCount(user.id)} active
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
