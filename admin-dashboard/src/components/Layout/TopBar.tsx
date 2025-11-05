import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem } from '@mui/material';
import { Logout, Notifications, AccountCircle } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';

const DRAWER_WIDTH = 260;

export function TopBar() {
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await signOut();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Welcome back, Admin
        </Typography>

        {/* Notifications */}
        <IconButton size="large" color="inherit" sx={{ mr: 1 }}>
          <Notifications />
        </IconButton>

        {/* User menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            {user?.email}
          </Typography>
          <IconButton onClick={handleMenu} size="small">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleLogout}>
            <Logout fontSize="small" sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

