// import { Link } from 'react-router-dom'; // signup link removed
import { useForm } from 'react-hook-form';
import { useLogin } from '../api/auth';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function LoginPage() {
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => login.mutate(data);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome back</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1 mb-8">Sign in to your account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />

        {/* <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium">
            Forgot password?
          </Link>
        </div> */}

        {login.error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{login.error.message}</p>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
          Sign In
        </Button>
      </form>

      {/* Sign up link hidden — accounts are created by admin only */}
      {/* <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don't have an account?{' '}
        <Link to="/signup" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
          Sign up free
        </Link>
      </p> */}
    </div>
  );
}
