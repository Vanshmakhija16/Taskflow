import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

function useSetAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  return (data) => {
    setAuth(data.user, data.access_token, data.refresh_token);
    toast.success(`Welcome, ${data.user.full_name || data.user.email}!`);
    navigate('/');
  };
}

// ── Email + password login ────────────────────────────────────────────────────
export const useLogin = () => {
  const handleAuth = useSetAuth();
  return useMutation({
    mutationFn: (creds) => api.post('/auth/login', creds).then((r) => r.data),
    onSuccess:  (data)  => handleAuth(data),
    onError:    (err)   => toast.error(err.response?.data?.error || 'Login failed'),
  });
};

// ── Signup ────────────────────────────────────────────────────────────────────
export const useSignup = () => {
  const handleAuth = useSetAuth();
  return useMutation({
    mutationFn: (body) => api.post('/auth/signup', body).then((r) => r.data),
    onSuccess:  (data) => handleAuth(data),
    onError:    (err)  => toast.error(err.response?.data?.error || 'Signup failed'),
  });
};

// ── Send OTP / Magic Link ─────────────────────────────────────────────────────
export const useSendOtp = () =>
  useMutation({
    mutationFn: (body) => api.post('/auth/otp/send', body).then((r) => r.data),
    onSuccess:  ()     => toast.success('Check your email for the OTP / magic link'),
    onError:    (err)  => toast.error(err.response?.data?.error || 'Failed to send OTP'),
  });

// ── Verify OTP ────────────────────────────────────────────────────────────────
export const useVerifyOtp = () => {
  const handleAuth = useSetAuth();
  return useMutation({
    mutationFn: (body) => api.post('/auth/otp/verify', body).then((r) => r.data),
    onSuccess:  (data) => handleAuth(data),
    onError:    (err)  => toast.error(err.response?.data?.error || 'Invalid OTP'),
  });
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const useLogout = () => {
  const { logout } = useAuthStore();
  const qc         = useQueryClient();
  const navigate   = useNavigate();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled:  () => {
      logout();
      qc.clear();
      navigate('/login');
    },
  });
};

// ── Forgot password ───────────────────────────────────────────────────────────
export const useForgotPassword = () =>
  useMutation({
    mutationFn: (body) => api.post('/auth/forgot-password', body).then((r) => r.data),
    onSuccess:  (data) => toast.success(data.message),
    onError:    (err)  => toast.error(err.response?.data?.error || 'Error sending reset link'),
  });
