// src/app/core/services/auth.service.ts - ENHANCED VERSION
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'employee' | 'secretariat';
  active: boolean;
  systemAccess: {
    laserCuttingManagement?: boolean;
  };
  routeAccess?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;  // Backend expects 'username' field
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: User;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  // Define allowed routes for each role
  private readonly ALLOWED_EMPLOYEE_ROUTES = [
    'suppliers',           // إدارة الموردين
    'itemsControl',        // إدارة الأصناف
    'receipts',            // إشعار استلام
    'emptyReceipt',        // إشعار فارغ
    'rfqs',                // طلب تسعير
    'purchases',           // طلب شراء
    'materialRequests',    // طلب مواد
    'priceQuotes',         // عرض سعر
    'proformaInvoice',     // الفواتير الأولية
    'costingSheet',        // كشف التكاليف
    'secretariatUserManagement' // طلبات الموظفين
  ];

  private readonly SECRETARIAT_ROUTES = [
    'secretariat',
    'secretariatUserManagement'
  ];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  // ============================================
  // GETTERS
  // ============================================

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Login user
   */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setSession(response.data.token, response.data.user);
          console.log('✅ User logged in:', response.data.user.name);
          console.log('📋 User role:', response.data.user.role);
          console.log('🔑 Route access:', response.data.user.routeAccess);
        }
      }),
      catchError(error => {
        console.error('❌ Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    console.log('👋 User logged out');
    this.router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;
    
    if (!token || !user) {
      return false;
    }

    // Check if token is expired (basic check)
    // You might want to implement proper JWT token validation
    return true;
  }

  // ============================================
  // ROUTE ACCESS CONTROL
  // ============================================

  /**
   * ✅ IMPROVED: Check if user has access to a specific route
   */
  hasRouteAccess(routeKey: string): boolean {
    const user = this.currentUserValue;
    
    if (!user) {
      console.warn('⚠️ No user found when checking route access');
      return false;
    }

    // Super admins have access to everything
    if (user.role === 'super_admin') {
      return true;
    }

    // Admins have access to everything except user management
    if (user.role === 'admin') {
      return routeKey !== 'users';
    }

    // Secretariat has access to specific routes
    if (user.role === 'secretariat') {
      return this.SECRETARIAT_ROUTES.includes(routeKey);
    }

    // Employees check their routeAccess array
    if (user.role === 'employee') {
      // First check if the route is in the allowed list for employees
      if (!this.ALLOWED_EMPLOYEE_ROUTES.includes(routeKey)) {
        console.warn(`⚠️ Route '${routeKey}' is not in allowed employee routes`);
        return false;
      }

      // Then check if user has been granted access to this route
      const userRoutes = user.routeAccess || [];
      const hasAccess = userRoutes.includes(routeKey);
      
      if (!hasAccess) {
        console.warn(`⚠️ Employee does not have access to '${routeKey}'`, {
          userRoutes,
          requestedRoute: routeKey
        });
      }
      
      return hasAccess;
    }

    console.warn(`⚠️ Unknown role or access check failed for: ${user.role}`);
    return false;
  }

  /**
   * Get accessible routes for current user
   */
  getAccessibleRoutes(): string[] {
    const user = this.currentUserValue;
    
    if (!user) {
      return [];
    }

    // Super admins have access to everything
    if (user.role === 'super_admin') {
      return ['*']; // Represents all routes
    }

    // Admins have access to everything except user management
    if (user.role === 'admin') {
      return ['*', '!users']; // All except users
    }

    // Secretariat has specific routes
    if (user.role === 'secretariat') {
      return this.SECRETARIAT_ROUTES;
    }

    // Employees have their assigned routes
    if (user.role === 'employee') {
      return user.routeAccess || [];
    }

    return [];
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string | string[]): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    if (Array.isArray(role)) {
      return role.includes(user.role);
    }

    return user.role === role;
  }

  /**
   * Check if user has system access permission
   */
  hasSystemAccess(accessKey: keyof User['systemAccess']): boolean {
    const user = this.currentUserValue;
    if (!user || !user.systemAccess) return false;
    return user.systemAccess[accessKey] || false;
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Set authentication session
   */
  private setSession(token: string, user: User): void {
    // Ensure routeAccess is initialized
    if (!user.routeAccess) {
      user.routeAccess = [];
    }

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      
      // Ensure routeAccess is initialized
      if (!user.routeAccess) {
        user.routeAccess = [];
      }

      return user;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }

  /**
   * Update stored user data
   */
  updateStoredUser(user: User): void {
    // Ensure routeAccess is initialized
    if (!user.routeAccess) {
      user.routeAccess = [];
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    console.log('✅ User data updated in storage');
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(API_ENDPOINTS.AUTH.FORGET_PASSWORD, { email });
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      newPassword
    });
  }

  /**
   * Change password for current user
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      { currentPassword, newPassword },
      { headers: this.getAuthHeaders() }
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get role display name in Arabic
   */
  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'super_admin': 'IT',
      'admin': 'المدير',
      'employee': 'موظف',
      'secretariat': 'سكرتيرة'
    };
    return roleNames[role] || role;
  }

  /**
   * Refresh current user data from server
   */
  refreshUserData(): Observable<User> {
    const userId = this.currentUserValue?.id;
    
    if (!userId) {
      return throwError(() => new Error('No user ID available'));
    }

    return this.http.get<any>(
      API_ENDPOINTS.USERS.GET_BY_ID(userId),
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data),
      tap(user => {
        this.updateStoredUser(user);
        console.log('✅ User data refreshed from server');
      })
    );
  }
}