import PeopleIcon from '@mui/icons-material/Groups';
import TimeOffIcon from '@mui/icons-material/BeachAccess';
import AttendanceIcon from '@mui/icons-material/AccessTime';
import PayrollIcon from '@mui/icons-material/AttachMoney';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import type { NavItem, UserRole } from './types';

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: <DashboardIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER', 'MANAGER'],
  },
  {
    label: 'Employees',
    path: '/employees',
    icon: <PeopleIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER', 'MANAGER'],
  },
  {
    label: 'Leave',
    path: '/leave',
    icon: <TimeOffIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: <AttendanceIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER', 'MANAGER'],
  },
  {
    label: 'Roster',
    path: '/roster',
    icon: <CalendarMonthIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER', 'MANAGER'],
  },
  {
    label: 'Payroll',
    path: '/payroll',
    icon: <PayrollIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER'],
  },
  {
    label: 'My Payslips',
    path: '/payroll/dashboard',
    icon: <PayrollIcon fontSize="small" />,
    roles: ['EMPLOYEE'],
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: <DescriptionIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER', 'MANAGER'],
  },
  {
    label: 'Doc Expiry',
    path: '/documents/expiry',
    icon: <NotificationsActiveIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER'],
  },
  {
    label: 'Settings',
    path: '/admin',
    icon: <SettingsIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER'],
    children: [
      {
        label: 'Company',
        path: '/admin/company',
        icon: <SettingsIcon fontSize="small" sx={{ fontSize: 16 }} />,
      },
      {
        label: 'Users',
        path: '/admin/users',
        icon: <PeopleIcon fontSize="small" sx={{ fontSize: 16 }} />,
      },
      {
        label: 'Leave Types',
        path: '/admin/leave-types',
        icon: <DescriptionIcon fontSize="small" sx={{ fontSize: 16 }} />,
      },
      {
        label: 'Audit Logs',
        path: '/admin/audit-logs',
        icon: <HistoryIcon fontSize="small" sx={{ fontSize: 16 }} />,
        roles: ['OWNER'],
      }
    ]
  },
  {
    label: 'Security',
    path: '/security',
    icon: <SecurityIcon fontSize="small" />,
    roles: ['ADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE'],
  },
];

export const filterNavItemsForRole = (role: UserRole | null): NavItem[] => {
  if (!role) {
    return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes('EMPLOYEE'));
  }

  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
};
