import { Link } from 'react-router-dom';
import { HomeIcon, FaceFrownIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] flex flex-col items-center justify-center p-6 text-center">
      <FaceFrownIcon className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
      <h1 className="text-7xl font-black text-violet-600 dark:text-violet-500">404</h1>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-3">Page not found</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-8 btn btn-md btn-primary"
      >
        <HomeIcon className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
