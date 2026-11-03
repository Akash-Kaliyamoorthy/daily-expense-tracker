import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import BrandMark from './BrandMark';

function FullPage({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}

/** Shown while the first "who is logged in?" check runs. */
function CheckingSession() {
  return (
    <FullPage>
      <div role="status" className="flex flex-col items-center gap-4">
        <BrandMark className="h-12 w-12 animate-pulse" />
        <p className="muted text-sm">Loading your account…</p>
      </div>
    </FullPage>
  );
}

/** Shown when the server could not be reached at all (e.g. a free host that is waking up). */
function ServerUnreachable({ onRetry }) {
  return (
    <FullPage>
      <BrandMark className="h-12 w-12" />
      <h1 className="text-2xl font-semibold">Can’t reach the server</h1>
      <p className="muted max-w-sm text-sm leading-relaxed">
        The app may still be waking up after a quiet period. This can take up to a minute. Your data
        is safe.
      </p>
      <Button onClick={onRetry}>Try again</Button>
    </FullPage>
  );
}

/** Pages that need a login. Anyone else is sent to /login and returned afterwards. */
export function ProtectedRoute() {
  const { user, loading, bootError, retry } = useAuth();
  const location = useLocation();

  if (loading) return <CheckingSession />;
  if (bootError) return <ServerUnreachable onRetry={retry} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Login / register pages: signed-in users go straight to the dashboard. */
export function PublicOnlyRoute() {
  const { user, loading, bootError, retry } = useAuth();

  if (loading) return <CheckingSession />;
  if (bootError) return <ServerUnreachable onRetry={retry} />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
