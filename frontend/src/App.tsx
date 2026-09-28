/**
 * App.tsx — Root component with React Router configuration.
 *
 * ROUTING STRUCTURE:
 * /login      → LoginPage (public)
 * /dashboard  → DashboardPage (protected — requires authentication)
 * /admin      → AdminPage (protected — requires admin privileges)
 * /           → Redirects to /dashboard
 *
 * ProtectedRoute wraps routes that need authentication.
 * It checks the Supabase session before rendering the child component.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — require authentication */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
