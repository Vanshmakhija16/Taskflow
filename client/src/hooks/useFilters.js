import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULTS = {
  search:      '',
  status:      '',
  priority:    '',
  project_id:  '',
  assignee_id: '',
  overdue:     false,
  sort_by:     'created_at',
  sort_dir:    'desc',
};

export function useFilters(initialOverrides = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const result = { ...DEFAULTS, ...initialOverrides };
    for (const key of Object.keys(DEFAULTS)) {
      const val = searchParams.get(key);
      if (val !== null) {
        result[key] = key === 'overdue' ? val === 'true' : val;
      }
    }
    return result;
  }, [searchParams]);

  const setFilters = useCallback((newFilters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(newFilters)) {
      // Only write non-empty, non-default values to URL
      if (value !== '' && value !== false && value != null) {
        params.set(key, String(value));
      }
    }
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const updateFilter = useCallback((key, value) => {
    setFilters({ ...filters, [key]: value });
  }, [filters, setFilters]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Clean API params — strip empty/false/default values
  const apiParams = useMemo(() => {
    const params = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value === '' || value === false || value == null) continue;
      if (key === 'sort_by'  && value === 'created_at') continue;
      if (key === 'sort_dir' && value === 'desc')        continue;
      params[key] = value;
    }
    return params;
  }, [filters]);

  const activeCount = useMemo(() => {
    return Object.entries(filters).filter(([key, val]) => {
      if (['sort_by', 'sort_dir'].includes(key)) return false;
      return val !== '' && val !== false && val != null;
    }).length;
  }, [filters]);

  return { filters, apiParams, setFilters, updateFilter, clearFilters, activeCount };
}
