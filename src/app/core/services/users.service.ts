// src/app/core/services/users.service.ts - CORRECTED VERSION
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

// ============================================
// INTERFACES
// ============================================

export interface User {
  id: string;
  username: string; // Auto-generated, kept for compatibility
  name: string;
  phone: string; // ✅ REQUIRED
  email?: string; // ✅ OPTIONAL
  role: 'super_admin' | 'admin' | 'employee' | 'secretariat';
  active: boolean;
  systemAccess: {
    laserCuttingManagement?: boolean;
  };
  routeAccess?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  phone: string; // ✅ REQUIRED
  email?: string; // ✅ OPTIONAL
  password: string;
  role: 'super_admin' | 'admin' | 'employee' | 'secretariat';
  systemAccess?: {
    laserCuttingManagement?: boolean;
  };
  routeAccess?: string[];
}

export interface UpdateUserData {
  name?: string;
  phone?: string; // ✅ Can update phone
  email?: string; // ✅ OPTIONAL
  password?: string;
  role?: 'super_admin' | 'admin' | 'employee' | 'secretariat';
  active?: boolean;
  systemAccess?: {
    laserCuttingManagement?: boolean;
  };
  routeAccess?: string[];
}

export interface UsersListResponse {
  success: boolean;
  data: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
  };
}

export interface UserResponse {
  success: boolean;
  message?: string;
  data: User;
}

export interface AvailableRoute {
  key: string;
  label: string;
  path: string;
  category: 'management' | 'procurement' | 'inventory' | 'operations' | 'reports';
}

export interface AvailableRoutesResponse {
  success: boolean;
  data: AvailableRoute[];
}

export interface UsernameCheckResponse {
  success: boolean;
  available: boolean;
  message: string;
}

export interface PhoneCheckResponse {
  success: boolean;
  data: {
    phone: string;
    available: boolean;
  };
}

export interface UsersFilters {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(private http: HttpClient) { }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Get authorization headers with token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ============================================
  // AVAILABLE ROUTES
  // ============================================

  /**
   * Get available routes for assignment to employees
   */
  getAvailableRoutes(): Observable<AvailableRoutesResponse> {
    return this.http.get<AvailableRoutesResponse>(
      API_ENDPOINTS.USERS.GET_AVAILABLE_ROUTES,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // CREATE USER
  // ============================================

  /**
   * Create a new user
   */
  createUser(userData: CreateUserData): Observable<UserResponse> {
    // ✅ Ensure routeAccess is initialized for employees
    if (userData.role === 'employee' && !userData.routeAccess) {
      userData.routeAccess = [];
    }

    // ✅ Validate routeAccess if provided
    if (userData.routeAccess && userData.routeAccess.length > 0) {
      console.log('📝 Creating user with route access:', {
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        routeAccess: userData.routeAccess
      });
    }

    return this.http.post<UserResponse>(
      API_ENDPOINTS.USERS.CREATE,
      userData,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // GET USERS
  // ============================================

  /**
   * Get all users with optional filters
   */
  getAllUsers(filters?: UsersFilters): Observable<UsersListResponse> {
    let params = new HttpParams();

    if (filters) {
      if (filters.role) {
        params = params.set('role', filters.role);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
    }

    return this.http.get<UsersListResponse>(
      API_ENDPOINTS.USERS.GET_ALL,
      {
        headers: this.getAuthHeaders(),
        params
      }
    );
  }

  /**
   * Get specific user by ID
   */
  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(
      API_ENDPOINTS.USERS.GET_BY_ID(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // UPDATE USER
  // ============================================

  /**
   * Update user information
   */
  updateUser(id: string, updateData: UpdateUserData): Observable<UserResponse> {
    return this.http.put<UserResponse>(
      API_ENDPOINTS.USERS.UPDATE(id),
      updateData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update user role
   */
  updateUserRole(id: string, role: 'super_admin' | 'admin' | 'employee' | 'secretariat'): Observable<UserResponse> {
    return this.http.patch<UserResponse>(
      API_ENDPOINTS.USERS.UPDATE_ROLE(id),
      { role },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Toggle user active status
   */
  toggleUserActive(id: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(
      API_ENDPOINTS.USERS.TOGGLE_ACTIVE(id),
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update username
   */
  updateUsername(id: string, username: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(
      API_ENDPOINTS.USERS.UPDATE_USERNAME(id),
      { username },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update user system access permissions
   */
  updateSystemAccess(id: string, systemAccess: { laserCuttingManagement?: boolean }): Observable<UserResponse> {
    return this.http.patch<UserResponse>(
      API_ENDPOINTS.USERS.UPDATE_SYSTEM_ACCESS(id),
      systemAccess,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * ✅ ENHANCED: Update employee route access permissions
   */
  updateRouteAccess(id: string, routeAccess: string[]): Observable<UserResponse> {
    // ✅ Validate input
    if (!Array.isArray(routeAccess)) {
      console.error('❌ Route access must be an array, received:', routeAccess);
      throw new Error('Route access must be an array');
    }

    // ✅ Remove duplicates
    const uniqueRoutes = [...new Set(routeAccess)];

    console.log('💾 Sending route access update:', {
      userId: id,
      routeCount: uniqueRoutes.length,
      routeAccess: uniqueRoutes
    });

    return this.http.patch<UserResponse>(
      API_ENDPOINTS.USERS.UPDATE_ROUTE_ACCESS(id),
      { routeAccess: uniqueRoutes },
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // DELETE USER
  // ============================================

  /**
   * Delete user
   */
  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      API_ENDPOINTS.USERS.DELETE(id),
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // USERNAME & PHONE AVAILABILITY
  // ============================================

  /**
   * Check if username is available
   */
  checkUsernameAvailability(username: string): Observable<UsernameCheckResponse> {
    return this.http.get<UsernameCheckResponse>(
      API_ENDPOINTS.USERS.CHECK_USERNAME(username),
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * ✅ NEW: Check if phone number is available
   */
  checkPhoneAvailability(phone: string): Observable<PhoneCheckResponse> {
    return this.http.get<PhoneCheckResponse>(
      `${API_ENDPOINTS.USERS.GET_ALL}/check/phone/${phone}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get role label in Arabic
   */
  getRoleLabel(role: string): string {
    const roles: { [key: string]: string } = {
      'super_admin': 'مدير النظام',
      'admin': 'مدير',
      'employee': 'موظف',
      'secretariat': 'سكرتارية'
    };
    return roles[role] || role;
  }

  /**
   * Get role color for UI
   */
  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      'super_admin': '#dc2626', // red
      'admin': '#ea580c',       // orange
      'employee': '#0891b2',     // cyan
      'secretariat': '#7c3aed'   // purple
    };
    return colors[role] || '#64748b';
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * ✅ NEW: Validate Jordanian phone number
   */
  isValidJordanianPhone(phone: string): boolean {
    const phoneRegex = /^07[0-9]{8}$/;
    return phoneRegex.test(phone);
  }

  /**
   * ✅ NEW: Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    if (!phone || phone.length !== 10) return phone;
    return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
  }

  /**
   * ✅ NEW: Clean phone number (remove spaces and dashes)
   */
  cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s-]/g, '');
  }

  /**
   * Validate username format
   */
  isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-z0-9._]+$/;
    return usernameRegex.test(username) && username.length >= 3;
  }

  /**
   * Generate username from name
   */
  generateUsernameFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .join('.');
  }

  /**
   * ✅ Validate route access keys against available routes
   */
  validateRouteKeys(routeKeys: string[], availableRoutes: AvailableRoute[]): {
    valid: boolean;
    invalidKeys: string[]
  } {
    const validKeys = availableRoutes.map(r => r.key);
    const invalidKeys = routeKeys.filter(key => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      console.warn('⚠️ Invalid route keys detected:', invalidKeys);
      console.log('✅ Valid route keys:', validKeys);
    }

    return {
      valid: invalidKeys.length === 0,
      invalidKeys
    };
  }

  /**
   * ✅ Get routes by category
   */
  getRoutesByCategory(routes: AvailableRoute[], category: string): AvailableRoute[] {
    return routes.filter(route => route.category === category);
  }

  /**
   * ✅ Get route display name by key
   */
  getRouteLabel(routeKey: string, availableRoutes: AvailableRoute[]): string {
    const route = availableRoutes.find(r => r.key === routeKey);
    return route ? route.label : routeKey;
  }

  /**
   * ✅ Count routes by category
   */
  countRoutesByCategory(routes: AvailableRoute[]): { [category: string]: number } {
    const counts: { [category: string]: number } = {
      management: 0,
      procurement: 0,
      inventory: 0,
      operations: 0,
      reports: 0
    };

    routes.forEach(route => {
      if (counts[route.category] !== undefined) {
        counts[route.category]++;
      }
    });

    return counts;
  }
}