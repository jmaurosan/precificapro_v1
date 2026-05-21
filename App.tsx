
import React, { Suspense } from 'react';
import { Navigate, Route, HashRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { InstallPWA } from './components/InstallPWA';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';

const Auth = React.lazy(() => import('./pages/Auth'));
const CalculatorPage = React.lazy(() => import('./pages/Calculator'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Financial = React.lazy(() => import('./pages/Financial'));
const ProjectFinances = React.lazy(() => import('./pages/ProjectFinances'));
const Projects = React.lazy(() => import('./pages/Projects'));
const ProposalsPage = React.lazy(() => import('./pages/Proposals'));
const PublicProposalPage = React.lazy(() => import('./pages/PublicProposal'));
const ReceiptsPage = React.lazy(() => import('./pages/Receipts'));
const Registrations = React.lazy(() => import('./pages/Registrations'));
const Schedule = React.lazy(() => import('./pages/Schedule'));
const ServicesPage = React.lazy(() => import('./pages/Services'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const Proposal = React.lazy(() => import('./pages/Proposal'));

const AppLoader: React.FC<{ label?: string }> = ({ label = 'Carregando...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-teal-100 dark:border-teal-900/30 border-t-teal-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 rounded-full animate-pulse"></div>
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 animate-pulse">{label}</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <AppLoader />;
  }
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<AppLoader label="Preparando tela..." />}>
      <Routes>
        <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/public/proposal/:token" element={<PublicProposalPage />} />
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
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <InstallPWA />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
