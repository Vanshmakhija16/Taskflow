import { useState } from 'react';
import { useUsers, useDeleteUser, useUpdateUser } from '../api/users';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { RoleBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select } from '../components/ui/Input';
import { useForm } from 'react-hook-form';
import { TrashIcon, PencilIcon, UsersIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { data: users = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();
  const [editUser, setEditUser] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  function openEdit(user) {
    setEditUser(user);
    reset({ role: user.role });
  }

  async function onEditSubmit({ role }) {
    await updateUser.mutateAsync({ id: editUser.id, role });
    toast.success('Role updated');
    setEditUser(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this user permanently?')) return;
    await deleteUser.mutateAsync(id);
    toast.success('User deleted');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6 text-violet-500" />
            Admin Panel
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage users and roles</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 self-start xs:self-auto">
          <UsersIcon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{users.length} users</span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">User</th>
                  <th className="px-5 py-3.5 text-left">Role</th>
                  <th className="px-5 py-3.5 text-left hidden md:table-cell">Joined</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(user => (
                  <tr key={user.id} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{user.full_name || '—'}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="xs" onClick={() => openEdit(user)}>
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => handleDelete(user.id)}>
                          <TrashIcon className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Change Role" size="sm">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Updating role for <strong className="text-slate-800 dark:text-slate-200">{editUser?.full_name || editUser?.email}</strong>
          </p>
          <Select label="Role" {...register('role')}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button size="sm" type="submit" loading={updateUser.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
