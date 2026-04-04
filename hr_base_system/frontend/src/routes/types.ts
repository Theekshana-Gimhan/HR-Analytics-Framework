import type { ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'OWNER' | 'MANAGER' | 'EMPLOYEE';

export type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
  roles?: UserRole[];
  children?: NavItem[];
};

export type RouteConfig = {
  element: ReactNode;
  path: string;
  roles?: UserRole[];
  children?: RouteConfig[];
};
