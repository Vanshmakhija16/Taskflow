import { create } from 'zustand';

function getInitialDarkMode() {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) return stored === 'true';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyDarkClass(enabled) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', enabled);
}

const initialDark = getInitialDarkMode();
applyDarkClass(initialDark);

export const useUIStore = create((set) => ({
  sidebarOpen:       true,
  taskModalOpen:     false,
  taskModalTaskId:   null,   // null = create mode, uuid = edit mode
  createTaskProject: null,
  darkMode:          initialDark,

  toggleSidebar:  () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),

  toggleDark: () => set((s) => {
    const next = !s.darkMode;
    localStorage.setItem('darkMode', String(next));
    applyDarkClass(next);
    return { darkMode: next };
  }),

  openCreateTask: (projectId = null) =>
    set({ taskModalOpen: true, taskModalTaskId: null, createTaskProject: projectId }),

  openEditTask: (taskId) =>
    set({ taskModalOpen: true, taskModalTaskId: taskId }),

  closeTaskModal: () =>
    set({ taskModalOpen: false, taskModalTaskId: null, createTaskProject: null }),
}));
