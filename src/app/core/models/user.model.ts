export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  systemAccess: SystemAccess;
  routeAccess?: string[];
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'super_admin' | 'admin' | 'employee' | 'secretariat';

export interface SystemAccess {
  laserCuttingManagement?: boolean;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  systemAccess?: SystemAccess;
  routeAccess?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
  systemAccess?: SystemAccess;
  routeAccess?: string[];
}

export interface AvailableRoute {
  key: string;
  label: string;
  path: string;
}

export interface UsersPagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
}

export const USER_ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'super_admin', label: 'مدير عام', color: '#dc2626' },
  { value: 'admin', label: 'مدير', color: '#ea580c' },
  { value: 'employee', label: 'موظف', color: '#0891b2' },
  { value: 'secretariat', label: 'سكرتارية', color: '#7c3aed' }
];
