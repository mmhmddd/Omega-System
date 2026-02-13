// src/app/core/models/user.model.ts (UPDATED - Phone Number Support)

export interface User {
  id: string;
  username: string; // Auto-generated, kept for compatibility
  name: string;
  phone: string; // ✅ REQUIRED - Jordanian phone number
  email?: string; // ✅ OPTIONAL - No longer required
  role: UserRole;
  active: boolean;
  systemAccess: SystemAccess;
  routeAccess?: string[];
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'employee' | 'secretariat';

export interface SystemAccess {
  laserCuttingManagement?: boolean;
}

export interface CreateUserRequest {
  name: string;
  phone: string; // ✅ REQUIRED
  email?: string; // ✅ OPTIONAL
  password: string;
  role: UserRole;
  systemAccess?: SystemAccess;
  routeAccess?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  email?: string; // ✅ OPTIONAL
  password?: string;
  role?: UserRole;
  active?: boolean;
  systemAccess?: SystemAccess;
  routeAccess?: string[];
}

export interface LoginCredentials {
  phone: string; // ✅ Changed from username to phone
  password: string;
}

export interface AvailableRoute {
  key: string;
  label: string;
  path: string;
  category: 'management' | 'procurement' | 'inventory' | 'operations' | 'reports';
}

export interface UsersPagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
}

export const USER_ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'super_admin', label: 'IT', color: '#dc2626' },
  { value: 'admin', label: 'المدير', color: '#ea580c' },
  { value: 'employee', label: 'موظف', color: '#0891b2' },
  { value: 'secretariat', label: 'سكرتيرة', color: '#7c3aed' }
];

/**
 * ✅ Validate Jordanian phone number format
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidJordanianPhone(phone: string): boolean {
  // Jordanian phone format: 07XXXXXXXX (10 digits starting with 07)
  const phoneRegex = /^07[0-9]{8}$/;
  return phoneRegex.test(phone);
}

/**
 * ✅ Format phone number for display
 * @param phone - Raw phone number
 * @returns Formatted phone number (e.g., "079 1234 567")
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || phone.length !== 10) return phone;
  
  // Format: 079 1234 567
  return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
}

/**
 * ✅ Clean phone number (remove spaces and dashes)
 * @param phone - Phone number with possible formatting
 * @returns Clean phone number
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}