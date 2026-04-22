import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * useRealtime
 * Subscribes to Supabase realtime changes on a given table and
 * automatically invalidates the matching React Query cache key.
 *
 * @param {string} table   - Supabase table name (e.g. 'tasks')
 * @param {string[]} queryKey - React Query key to invalidate on change
 * @param {object} [filter] - Optional Supabase filter { column, value }
 */
export function useRealtime(table, queryKey, filter = null) {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    let channel = supabase.channel(`realtime:${table}:${JSON.stringify(filter)}`);

    const config = { event: '*', schema: 'public', table };
    if (filter) {
      config.filter = `${filter.column}=eq.${filter.value}`;
    }

    channel = channel.on('postgres_changes', config, (payload) => {
      console.log('[Realtime]', table, payload.eventType);
      queryClient.invalidateQueries({ queryKey });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to ${table}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, JSON.stringify(queryKey), JSON.stringify(filter)]);
}

/**
 * useTaskRealtime
 * Convenience hook — subscribes to all task changes for a given project.
 */
export function useTaskRealtime(projectId) {
  useRealtime(
    'tasks',
    ['tasks'],
    projectId ? { column: 'project_id', value: projectId } : null
  );
}

/**
 * useNotificationRealtime
 * Subscribes to notification inserts for the current user.
 */
export function useNotificationRealtime(userId) {
  useRealtime(
    'notifications',
    ['notifications'],
    userId ? { column: 'user_id', value: userId } : null
  );
}
