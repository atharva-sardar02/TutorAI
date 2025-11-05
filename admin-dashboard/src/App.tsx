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

// Session Intelligence pages
import { DailySummaries } from './pages/SessionIntel/DailySummaries';
import { WeeklySummaries } from './pages/SessionIntel/WeeklySummaries';
import { SIAnalytics } from './pages/SessionIntel/SIAnalytics';

function SessionIntelPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Session Intelligence Overview</h2>
      <p>Select a section from the sidebar:</p>
      <ul>
        <li><a href="/session-intel/daily">Daily Summaries</a></li>
        <li><a href="/session-intel/weekly">Weekly Summaries</a></li>
        <li><a href="/session-intel/analytics">SI Analytics</a></li>
      </ul>
    </div>
  );
}

// Fraud & Experiments pages
import { FraudQueue } from './pages/Fraud/FraudQueue';
import { ExperimentList } from './pages/Experiments/ExperimentList';

// System pages
import { KillSwitches } from './pages/System/KillSwitches';
import { AuditLog } from './pages/System/AuditLog';
import { SystemHealth } from './pages/System/SystemHealth';
import { UserManagement } from './pages/System/UserManagement';

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
                path="/session-intel/daily"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DailySummaries />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/session-intel/weekly"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <WeeklySummaries />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/session-intel/analytics"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SIAnalytics />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fraud"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <FraudQueue />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/experiments"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ExperimentList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SystemHealth />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system/kill-switches"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <KillSwitches />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system/users"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <UserManagement />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <AuditLog />
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
