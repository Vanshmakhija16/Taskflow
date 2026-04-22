import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';

function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

/**
 * Fetch all recurring tasks for the current user (or a specific user via userId).
 * Each task has: completed_today (bool), completed_by_today, completed_at_today
 */
export function useRecurringTasks({ userId } = {}) {
  return useQuery({
    queryKey: ['recurring', userId || 'me'],
    queryFn: async () => {
      const params = userId ? { user_id: userId } : {};
      const { data } = await api.get('/tasks/recurring', { params });
      return toArray(data);
    },
    placeholderData: [],
    refetchOnWindowFocus: true,
    staleTime: 30_000, // 30s — fresh enough for a habit tracker
  });
}

/**
 * Mark a recurring task complete for today (current user).
 */
export function useCompleteToday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId) =>
      api.post(`/tasks/${taskId}/complete-today`).then(r => r.data),
    // Optimistic update so the UI toggles instantly
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['recurring'] });
      const prev = qc.getQueriesData({ queryKey: ['recurring'] });
      qc.setQueriesData({ queryKey: ['recurring'] }, (old) =>
        toArray(old).map(t =>
          t.id === taskId
            ? { ...t, completed_today: true, completed_at_today: new Date().toISOString() }
            : t
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error('Failed to mark complete');
    },
    onSuccess: () => {
      toast.success('Marked complete for today ✓');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

/**
 * Unmark today's completion for a recurring task (current user).
 */
export function useUncompleteToday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId) =>
      api.delete(`/tasks/${taskId}/complete-today`).then(r => r.data),
    // Optimistic update
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['recurring'] });
      const prev = qc.getQueriesData({ queryKey: ['recurring'] });
      qc.setQueriesData({ queryKey: ['recurring'] }, (old) =>
        toArray(old).map(t =>
          t.id === taskId
            ? { ...t, completed_today: false, completed_at_today: null }
            : t
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error('Failed to unmark');
    },
    onSuccess: () => {
      toast.success('Unmarked for today');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

/**
 * Fetch completion history for a specific recurring task.
 * Returns array of { completion_date, completed_at } sorted newest-first.
 * @param {string} taskId
 * @param {number} limit - max days to fetch (default 30, max 90)
 */
export function useRecurringHistory(taskId, limit = 30) {
  return useQuery({
    queryKey: ['recurring-history', taskId, limit],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/recurring-history`, {
        params: { limit },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!taskId,
    placeholderData: [],
    staleTime: 60_000,
  });
}
