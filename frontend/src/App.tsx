/**
 * App.tsx — Root component with React Router configuration.
 *
 * ROUTING STRUCTURE:
 * /           → LandingPage (public — marketing/SEO page)
 * /login      → LoginPage (public)
 * /dashboard  → DashboardPage (protected — requires authentication)
 * /admin      → AdminPage (protected — requires admin privileges)
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
