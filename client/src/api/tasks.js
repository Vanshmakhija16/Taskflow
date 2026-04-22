import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';

/* ── helpers ─────────────────────────── */
function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data))  return data.data;
  if (Array.isArray(data.tasks)) return data.tasks;
  return [];
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

/* ── fetch tasks (my tasks) ─────────────────── */
export function useTasks(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== false && v != null)
  );
  return useQuery({
    queryKey: ['tasks', cleanParams],
    queryFn: async () => {
      const { data } = await api.get('/tasks/my', { params: cleanParams });
      return dedupe(toArray(data));
    },
    placeholderData: [],
  });
}

/* ── useCalendar — pass user_id to backend for team member calendars ── */
export function useCalendar({ start, end, user_id } = {}) {
  return useQuery({
    queryKey: ['tasks', 'calendar', start, end, user_id],
    queryFn: async () => {
      const params = {};
      if (start)   params.date_from = start;
      if (end)     params.date_to   = end;
      if (user_id) params.user_id   = user_id;
      const { data } = await api.get('/tasks/calendar', { params });
      return dedupe(toArray(data));
    },
    placeholderData: [],
    enabled: !!start && !!end,
    keepPreviousData: false,
  });
}

/* ── fetch single task ── */
export function useTask(id) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data?.task ?? data ?? null;
    },
    enabled: !!id && id !== 'undefined',
  });
}

/* ── tasks assigned to a specific user (UserTasksPage) ── */
export function useUserTasks(userId) {
  return useQuery({
    queryKey: ['tasks', 'user', userId],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/user/${userId}`);
      return data;
    },
    placeholderData: { data: [], meta: { total: 0 } },
    enabled: !!userId,
  });
}

/* ── tasks assigned by me to others (TeamPage) ── */
export function useAssignedByMe() {
  return useQuery({
    queryKey: ['tasks', 'assigned-by-me'],
    queryFn: async () => {
      const { data } = await api.get('/tasks/assigned-by-me');
      return data;
    },
    placeholderData: { data: [], by_user: {}, meta: { total: 0 } },
  });
}

/* ── create ── */
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/tasks', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Task created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create task'),
  });
}

/* ── update ── */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => {
      if (!id || id === 'undefined') throw new Error('Invalid task id');
      return api.patch(`/tasks/${id}`, payload).then(r => r.data);
    },
    onMutate: async ({ id, ...payload }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueriesData({ queryKey: ['tasks'] });
      qc.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        const arr = toArray(old);
        return arr.map(t => t.id === id ? { ...t, ...payload } : t);
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error('Failed to update task');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onSuccess: () => toast.success('Task updated'),
  });
}

/* ── delete ── */
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => {
      if (!id || id === 'undefined') throw new Error('Invalid task id');
      return api.delete(`/tasks/${id}`).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });
}

/* ── archive ── */
export function useArchiveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => {
      if (!id || id === 'undefined') throw new Error('Invalid task id');
      return api.patch(`/tasks/${id}/archive`).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Task archived');
    },
    onError: () => toast.error('Failed to archive task'),
  });
}

/* ── reopen ── */
export function useReopenTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => {
      if (!id || id === 'undefined') throw new Error('Invalid task id');
      return api.patch(`/tasks/${id}/reopen`).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Task reopened');
    },
    onError: () => toast.error('Failed to reopen task'),
  });
}

/* ── assign task ── */
export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, assigneeId }) => {
      if (!taskId || taskId === 'undefined') throw new Error('Invalid task id');
      return api.patch(`/tasks/${taskId}`, { assignee_id: assigneeId }).then(r => r.data);
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task assigned');
    },
    onError: () => toast.error('Failed to assign task'),
  });
}

/* ── update location trainer counts ── */
export function useUpdateLocationCounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, locationId, trainers_sent, trainers_approved }) => {
      if (!taskId || !locationId) throw new Error('Missing ids');
      return api.patch(`/tasks/${taskId}/locations/${locationId}/counts`, {
        trainers_sent, trainers_approved,
      }).then(r => r.data);
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId] });
      toast.success('Trainer counts updated');
    },
    onError: () => toast.error('Failed to update trainer counts'),
  });
}

/* ── bulk update ── */
export function useBulkUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.patch('/tasks/bulk', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tasks updated');
    },
    onError: () => toast.error('Bulk update failed'),
  });
}

/* ── move (optimistic DnD) ── */
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }) => {
      if (!taskId || taskId === 'undefined') throw new Error('Invalid task id');
      return api.patch(`/tasks/${taskId}`, { status }).then(r => r.data);
    },
    onMutate: async ({ taskId, status }) => {
      if (!taskId || taskId === 'undefined') return;
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueriesData({ queryKey: ['tasks'] });
      qc.setQueriesData({ queryKey: ['tasks'] }, (old) => {
        const arr = toArray(old);
        return arr.map(t => t.id === taskId ? { ...t, status } : t);
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error('Failed to move task');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
