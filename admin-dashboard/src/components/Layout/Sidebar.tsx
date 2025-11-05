import React, { useState } from 'react';
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
  Collapse,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
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

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  subItems?: { path: string; label: string }[];
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  {
    path: '/growth',
    label: 'Growth Metrics',
    icon: <TrendingUp />,
    subItems: [
      { path: '/growth/k-factor', label: 'K-Factor' },
      { path: '/growth/funnel', label: 'Funnel' },
      { path: '/growth/retention', label: 'Retention' },
      { path: '/growth/percentile', label: 'Percentile' },
    ],
  },
  {
    path: '/session-intel',
    label: 'Session Intelligence',
    icon: <Psychology />,
    subItems: [
      { path: '/session-intel/daily', label: 'Daily Summaries' },
      { path: '/session-intel/weekly', label: 'Weekly Summaries' },
      { path: '/session-intel/analytics', label: 'SI Analytics' },
    ],
  },
  { path: '/fraud', label: 'Fraud Detection', icon: <Security /> },
  { path: '/experiments', label: 'Experiments', icon: <Science /> },
  {
    path: '/system',
    label: 'System & Health',
    icon: <Settings />,
    subItems: [
      { path: '/system', label: 'Health Dashboard' },
      { path: '/system/kill-switches', label: 'Kill Switches' },
      { path: '/system/users', label: 'User Management' },
    ],
  },
  { path: '/audit', label: 'Audit Log', icon: <Assessment /> },
];

export function Sidebar() {
  const location = useLocation();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ 
    '/growth': true, 
    '/session-intel': true,
    '/system': true 
  });

  const handleToggle = (path: string) => {
    setOpenItems((prev) => ({ ...prev, [path]: !prev[path] }));
  };

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
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openItems[item.path];
          
          return (
            <React.Fragment key={item.path}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={hasSubItems ? 'div' : Link}
                  to={hasSubItems ? undefined : item.path}
                  onClick={hasSubItems ? () => handleToggle(item.path) : undefined}
                  selected={isActive && !hasSubItems}
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
                  {hasSubItems && (
                    isOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.6)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.6)' }} />
                  )}
                </ListItemButton>
              </ListItem>

              {/* Sub-items */}
              {hasSubItems && (
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems!.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <ListItem key={subItem.path} disablePadding sx={{ mb: 0.5 }}>
                          <ListItemButton
                            component={Link}
                            to={subItem.path}
                            selected={isSubActive}
                            sx={{
                              pl: 4,
                              borderRadius: 1.5,
                              ml: 2,
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
                            <ListItemText 
                              primary={subItem.label}
                              primaryTypographyProps={{
                                fontSize: 13,
                                fontWeight: isSubActive ? 600 : 400,
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Drawer>
  );
}

