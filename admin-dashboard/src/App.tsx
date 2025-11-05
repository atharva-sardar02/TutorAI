import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MainLayout } from './components/Layout/MainLayout';
import theme from './theme';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Growth pages
import { KFactorDashboard } from './pages/Growth/KFactorDashboard';
import { FunnelMetrics } from './pages/Growth/FunnelMetrics';
import { RetentionMetrics } from './pages/Growth/RetentionMetrics';
import { PercentileMonitor } from './pages/Growth/PercentileMonitor';

// Placeholder page for growth overview
function GrowthPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Growth Metrics Overview</h2>
      <p>Select a metric from the sidebar:</p>
      <ul>
        <li><a href="/growth/k-factor">K-Factor Dashboard</a></li>
        <li><a href="/growth/funnel">Conversion Funnel</a></li>
        <li><a href="/growth/retention">Retention Analysis</a></li>
        <li><a href="/growth/percentile">Percentile Monitor</a></li>
      </ul>
    </div>
  );
}

function SessionIntelPage() {
  return <div style={{ padding: '20px' }}><h2>Session Intelligence</h2><p>Coming soon in PR-ADMIN-04</p></div>;
}

function FraudPage() {
  return <div style={{ padding: '20px' }}><h2>Fraud Detection</h2><p>Coming soon in PR-ADMIN-05</p></div>;
}

function ExperimentsPage() {
  return <div style={{ padding: '20px' }}><h2>Experiments</h2><p>Coming soon in PR-ADMIN-05</p></div>;
}

function SystemPage() {
  return <div style={{ padding: '20px' }}><h2>System & Health</h2><p>Coming soon in PR-ADMIN-06</p></div>;
}

function AuditPage() {
  return <div style={{ padding: '20px' }}><h2>Audit Log</h2><p>Coming soon in PR-ADMIN-06</p></div>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes with layout */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/growth"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <GrowthPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/growth/k-factor"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <KFactorDashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/growth/funnel"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <FunnelMetrics />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/growth/retention"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <RetentionMetrics />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/growth/percentile"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PercentileMonitor />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/session-intel"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SessionIntelPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fraud"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <FraudPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/experiments"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ExperimentsPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SystemPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <AuditPage />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
