import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] flex">
      {/* Left panel — decorative, hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Mindery TaskFlow</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
            Manage work,<br />ship faster.
          </h1>
          <p className="text-violet-200 text-lg leading-relaxed max-w-sm">
            A clean, fast task manager with Kanban boards, team collaboration, and real-time updates.
          </p>

          {/* Fake testimonial */}
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
            <p className="text-white/90 text-sm leading-relaxed">
              "TaskFlow completely transformed how our team ships, everything is visible, nothing gets lost."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-violet-400 flex items-center justify-center text-white text-xs font-bold">S</div>
              <div>
                <p className="text-white text-sm font-semibold">Sarah K.</p>
                <p className="text-violet-300 text-xs">Engineering Lead</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-violet-300 text-xs">© 2026 Mindery. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black">T</span>
          </div>
          <span className="text-slate-900 dark:text-white font-bold text-xl">TaskFlow</span>
        </div>

        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
