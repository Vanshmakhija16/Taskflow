import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useSignup } from '../api/auth';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function SignupPage() {
  const signup = useSignup();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = (data) =>
    signup.mutate({ email: data.email, password: data.password, full_name: data.full_name });

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create account</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1 mb-8">Start managing tasks today — it's free</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          placeholder="Jane Doe"
          error={errors.full_name?.message}
          {...register('full_name', { required: 'Name is required' })}
        />
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
          placeholder="Min. 8 characters"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
          })}
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirm?.message}
          {...register('confirm', {
            validate: v => v === watch('password') || 'Passwords do not match',
          })}
        />

        {signup.error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{signup.error.message}</p>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={signup.isPending}>
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
