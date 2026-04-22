import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useForgotPassword } from '../api/auth';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const forgotPassword = useForgotPassword();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    await forgotPassword.mutateAsync(email);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Check your email</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          We've sent a password reset link to your email address.
        </p>
        <Link to="/login" className="block text-primary-600 hover:underline text-sm font-medium">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset password</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Enter your email and we'll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />

        {forgotPassword.error && (
          <p className="text-sm text-red-500 text-center">{forgotPassword.error.message}</p>
        )}

        <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Remembered it?{' '}
        <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
