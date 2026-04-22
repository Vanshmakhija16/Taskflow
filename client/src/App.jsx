import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import AppLayout    from './components/layout/AppLayout';
import AuthLayout   from './components/layout/AuthLayout';

// Auth pages
import LoginPage          from './pages/LoginPage';
// import SignupPage         from './pages/SignupPage'; // HIDDEN — admin creates users only
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// App pages
import DashboardPage      from './pages/DashboardPage';
import BoardPage          from './pages/BoardPage';
import CalendarPage       from './pages/CalendarPage';
import RecurringPage      from './pages/RecurringPage';
import TaskDetailPage     from './pages/TaskDetailPage';
import ProjectsPage       from './pages/ProjectsPage';
import TeamPage           from './pages/TeamPage';
import UserTasksPage      from './pages/UserTasksPage';
import UserCalendarPage   from './pages/UserCalendarPage';
import UserRecurringPage  from './pages/UserRecurringPage';
import AdminPage          from './pages/AdminPage';
import SettingsPage       from './pages/SettingsPage';
import NotFoundPage       from './pages/NotFoundPage';

/* ── Route guards ─────────────────────── */
function PrivateRoute({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user } = useAuthStore();
  return user ? <Navigate to="/" replace /> : children;
}

/* ── App ──────────────────────────────── */
export default function App() {
  return (
    <Routes>
      {/* ── Auth routes ── */}
      <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
        <Route path="/login"           element={<LoginPage />} />
        {/* <Route path="/signup" element={<SignupPage />} /> — HIDDEN: admin creates users only */}
        <Route path="/signup"          element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* ── App routes ── */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index                          element={<DashboardPage />} />
        <Route path="board"                   element={<BoardPage />} />
        <Route path="calendar"                element={<CalendarPage />} />
        <Route path="recurring"               element={<RecurringPage />} />
        <Route path="tasks/:id"               element={<TaskDetailPage />} />
        <Route path="projects"                element={<ProjectsPage />} />
        <Route path="team"                    element={<TeamPage />} />
        <Route path="team/:id"                element={<UserTasksPage />} />
        <Route path="team/:id/calendar"       element={<UserCalendarPage />} />
        <Route path="team/:id/recurring"      element={<UserRecurringPage />} />
        <Route path="settings"                element={<SettingsPage />} />
        <Route path="admin"                   element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
