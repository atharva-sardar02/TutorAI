import React from 'react';
import { Box, Toolbar } from '@mui/material';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const DRAWER_WIDTH = 260;

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <TopBar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {children}
      </Box>
    </Box>
  );
}

