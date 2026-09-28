/**
 * ProtectedRoute — redirects unauthenticated users to login.
 *
 * HOW ROUTE PROTECTION WORKS:
 * This component wraps around any route that requires authentication.
 * It checks if the user has an active Supabase session:
 * - If authenticated → render the child route (Outlet)
 * - If not authenticated → redirect to /login
 * - If still loading → show a spinner
 *
 * This is a common React Router pattern for client-side route protection.
 * Note: This is a UX convenience, NOT a security measure.
 * The real security is in the backend JWT validation.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
      </div>
    );
  }

  // If not authenticated, redirect to login.
  // 'replace' prevents the login page from being added to history,
  // so pressing "back" doesn't take the user to the protected page.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render the child route
  return <Outlet />;
}
