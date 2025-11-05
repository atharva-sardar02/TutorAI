import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'analyst' | 'support';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAdmin, role, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  // Redirect to login if not authenticated or not admin
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if requiredRole is specified
  if (requiredRole && role !== requiredRole && role !== 'admin') {
    // Admin role has access to everything
    // Otherwise, check if user's role matches required role
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p>Required role: {requiredRole}</p>
          <p>Your role: {role}</p>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
}

