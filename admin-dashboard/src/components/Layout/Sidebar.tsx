import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  Psychology,
  Security,
  Science,
  Settings,
  Assessment,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/growth', label: 'Growth Metrics', icon: <TrendingUp /> },
  { path: '/session-intel', label: 'Session Intelligence', icon: <Psychology /> },
  { path: '/fraud', label: 'Fraud Detection', icon: <Security /> },
  { path: '/experiments', label: 'Experiments', icon: <Science /> },
  { path: '/system', label: 'System & Health', icon: <Settings /> },
  { path: '/audit', label: 'Audit Log', icon: <Assessment /> },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#1a1a1a',
          color: 'white',
        },
      }}
    >
      {/* Logo/Brand */}
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          TutorAI
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Admin Dashboard
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Navigation */}
      <List sx={{ mt: 2, px: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'white' : 'rgba(255,255,255,0.6)' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}

