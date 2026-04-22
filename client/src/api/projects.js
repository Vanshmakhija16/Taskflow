import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import toast from 'react-hot-toast';

function toArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data))     return data.data;
  if (Array.isArray(data.projects)) return data.projects;
  return [];
}

export function useProjects(params = {}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const { data } = await api.get('/projects', { params });
      return toArray(data);
    },
    placeholderData: [],
  });
}

export function useProject(id) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data?.project ?? data ?? null;
    },
    enabled: !!id,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/projects/dashboard-stats');
      return data?.stats ?? data ?? {};
    },
    placeholderData: {},
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/projects', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
    },
    onError: () => toast.error('Failed to create project'),
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, role }) =>
      api.post(`/projects/${projectId}/members`, { userId, role }).then(r => r.data),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }) =>
      api.delete(`/projects/${projectId}/members/${userId}`).then(r => r.data),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });
}
