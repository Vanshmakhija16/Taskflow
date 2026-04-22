import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import api from '@/lib/axios';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:  null,
      token: null,
      refreshToken: null,
      _initialized: false,

      setAuth: (user, token, refreshToken = null) =>
        set({ user, token, refreshToken }),

      updateUser: (updates) =>
        set({ user: { ...get().user, ...updates } }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null }),

      setInitialized: () => set({ _initialized: true }),
    }),
    {
      name: 'taskflow-auth',
      partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }),
    }
  )
);

/**
 * initAuth — call once at app boot (in main.jsx or a top-level component).
 * Restores session from Supabase, refreshes token if needed, syncs Zustand.
 */
export async function initAuth() {
  const store = useAuthStore.getState();

  try {
    // 1. Try to restore existing browser Supabase session
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      await syncSession(session);
    } else if (store.refreshToken) {
      // 2. No Supabase session but we have a stored refresh token (login went
      //    through our backend, so the browser client has no session) — refresh
      //    via our API and keep the persisted user.
      try {
        const { data } = await api.post('/auth/refresh', { refresh_token: store.refreshToken });
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user,
          data.access_token,
          data.refresh_token
        );
      } catch {
        useAuthStore.getState().logout();
      }
    }
    // else: no session and no refresh token — user just isn't logged in; don't
    // touch the store (nothing to clear).
  } catch {
    // Swallow — keep whatever persisted state we have.
  } finally {
    useAuthStore.getState().setInitialized();
  }

  // 3. Listen for future auth changes. We only react to explicit sign-outs and
  //    to new sessions — ignore INITIAL_SESSION/TOKEN_REFRESHED with null, which
  //    fires on every load when login went through the backend (the browser
  //    Supabase client has no local session to restore).
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      await syncSession(session);
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().logout();
    }
  });
}

async function syncSession(session) {
  const token = session.access_token;
  useAuthStore.getState().setAuth(
    useAuthStore.getState().user,
    token,
    session.refresh_token
  );
  // Fetch fresh profile so role / avatar are always current
  try {
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    useAuthStore.getState().setAuth(data.user, token, session.refresh_token);
  } catch {
    // Non-fatal: user still logged in, just profile not refreshed
  }
}
