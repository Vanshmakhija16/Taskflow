import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';

function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data))     return data.data;
  if (Array.isArray(data.comments)) return data.comments;
  return [];
}

export function useComments(taskId) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/comments/${taskId}`);
      return toArray(data);
    },
    enabled: !!taskId,
    placeholderData: [],
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, content, parentId }) =>
      api.post('/comments', { task_id: taskId, content, parent_id: parentId || null }).then(r => r.data),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: () => toast.error('Failed to post comment'),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }) => api.delete(`/comments/${commentId}`).then(r => r.data),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: () => toast.error('Failed to delete comment'),
  });
}
