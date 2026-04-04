import React, { Suspense, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';

import { filterNavItemsForRole, NAV_ITEMS } from '../../routes/navConfig';
import { clearSession, getCurrentUserRole } from '../../lib/auth';
import PageLoader from '../../components/common/PageLoader';
import SkipNavLink from '../../components/common/SkipNavLink';
import useNetworkStatus from '../../hooks/useNetworkStatus';

const drawerWidth = 264;

const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { online } = useNetworkStatus();

  const role = getCurrentUserRole();
  const navItems = useMemo(() => {
    if (!role) {
      return NAV_ITEMS;
    }
    return filterNavItemsForRole(role);
  }, [role]);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>SH</Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              Simpala HR
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Empowering People Ops
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <Divider />
      <List component="nav" aria-label="Primary navigation" sx={{ flexGrow: 1, px: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end={item.path === '/'}
            onClick={() => setMobileOpen(false)}
            selected={isActive(item.path)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: (theme: Theme) => theme.palette.primary.main,
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Logged in as {role ?? 'Guest'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SkipNavLink />
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          ml: { md: `${drawerWidth}px` },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backdropFilter: 'blur(6px)',
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            color="inherit"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-controls="mobile-navigation"
            aria-expanded={mobileOpen}
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            {navItems.find((item) => isActive(item.path))?.label ?? 'Dashboard'}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {/* TODO: Implement notifications backend before re-enabling bell icon */}
          <Button variant="contained" color="primary" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
        {!online && (
          <Box
            role="status"
            aria-live="polite"
            sx={{
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              px: 2,
              py: 0.5,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="body2">You are offline. Some actions may be unavailable.</Typography>
          </Box>
        )}
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="main navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: 0,
            },
          }}
          aria-label="Primary navigation"
          PaperProps={{ id: 'mobile-navigation' }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: 0,
            },
          }}
          aria-label="Primary navigation"
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 3, lg: 4 },
          py: { xs: 3, sm: 4 },
          mt: { xs: 7, sm: 8 },
          width: '100%',
          backgroundColor: 'background.default',
        }}
        id="main-content"
        tabIndex={-1}
      >
        {/* Breadcrumbs */}
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs aria-label="breadcrumb" separator="/">
            {location.pathname
              .split('/')
              .filter(Boolean)
              .reduce<{ path: string; label: string }[]>((acc, seg) => {
                const prev = acc.length ? acc[acc.length - 1].path : '';
                const path = `${prev}/${seg}`;
                const label = seg.charAt(0).toUpperCase() + seg.slice(1);
                acc.push({ path, label });
                return acc;
              }, [])
              .map((crumb, idx, arr) =>
                idx < arr.length - 1 ? (
                  <Link
                    component={RouterLink}
                    color="inherit"
                    underline="hover"
                    to={crumb.path}
                    key={crumb.path}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <Typography color="text.primary" key={crumb.path}>
                    {crumb.label || 'Home'}
                  </Typography>
                )
              )}
          </Breadcrumbs>
        </Box>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
};

export default AppShell;
