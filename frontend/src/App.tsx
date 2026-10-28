/**
 * App.tsx — Root component with React Router configuration.
 *
 * ROUTING STRUCTURE:
 * /           → LandingPage (public — marketing/SEO page)
 * /login      → LoginPage (public)
 * /dashboard  → DashboardPage (protected — requires authentication)
 * /admin      → AdminPage (protected — requires admin privileges)
 * *           → NotFoundPage (catch-all 404)
 *
 * ProtectedRoute wraps routes that need authentication.
 * It checks the Supabase session before rendering the child component.
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — require authentication */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

