
import React from 'react';
import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import Auth from './pages/Auth';
import CalculatorPage from './pages/Calculator';
import Dashboard from './pages/Dashboard';
import Financial from './pages/Financial';
import ProjectFinances from './pages/ProjectFinances';
import Projects from './pages/Projects';
import ProposalsPage from './pages/Proposals';
import ReceiptsPage from './pages/Receipts';
import Registrations from './pages/Registrations';
import Schedule from './pages/Schedule';
import ServicesPage from './pages/Services';
import SettingsPage from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            {/* Spinner externo */}
            <div className="w-16 h-16 border-4 border-teal-100 dark:border-teal-900/30 border-t-teal-500 rounded-full animate-spin"></div>
            {/* Pulso interno */}
            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 rounded-full animate-pulse"></div>
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

import Proposal from './pages/Proposal';

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id/finances" element={<ProjectFinances />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/receipts" element={<ReceiptsPage />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/proposal-view" element={<Proposal />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/registrations" element={<Registrations />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
