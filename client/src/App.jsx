import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Register from './pages/Register';

// Signed-in pages are loaded on demand, so the login screen stays small and
// the chart library is only downloaded when a page that draws charts opens.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MonthlySetup = lazy(() => import('./pages/MonthlySetup'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const Categories = lazy(() => import('./pages/Categories'));

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="setup" element={<MonthlySetup />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="categories" element={<Categories />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
