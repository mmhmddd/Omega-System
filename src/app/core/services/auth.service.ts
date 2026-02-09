// src/app/core/services/auth.service.ts - FIXED VERSION
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, interval } from 'rxjs';
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
  username: string;
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
  private refreshInterval: any;

  // ✅ FIXED: Complete list matching backend exactly (11 routes)
  private readonly ALLOWED_EMPLOYEE_ROUTES = [
    'suppliers',              // إدارة الموردين
    'itemsControl',           // إدارة الأصناف
    'receipts',               // إيصالات الاستلام
    'rfqs',                   // طلبات عروض الأسعار
    'purchases',              // أوامر الشراء
    'materialRequests',       // طلبات المواد
    'priceQuotes',            // عروض الأسعار
    'proformaInvoice',        // فاتورة مُقدمة
    'costingSheet',           // كشف التكاليف
    'secretariatUserManagement', // نماذج الموظف
    'filesControl'            // إدارة الملفات
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

    // Log allowed routes on initialization
    console.log('✅ Auth Service Initialized');
    console.log('📋 Allowed Employee Routes:', this.ALLOWED_EMPLOYEE_ROUTES);

    this.startAutoRefresh();
  }

  // ============================================
  // AUTO-REFRESH USER DATA
  // ============================================

  private startAutoRefresh(): void {
    // Refresh user data every 30 seconds
    this.refreshInterval = interval(30000).subscribe(() => {
      if (this.isAuthenticated()) {
        this.refreshUserDataSilently();
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
      this.refreshInterval = null;
    }
  }

  private refreshUserDataSilently(): void {
    const userId = this.currentUserValue?.id;
    
    if (!userId) {
      return;
    }

    this.http.get<any>(
      API_ENDPOINTS.USERS.ME,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        if (error.status === 401) {
          console.log('🔒 Session expired, logging out...');
          this.logout();
        }
        return throwError(() => error);
      })
    ).subscribe({
      next: (user) => {
        const currentUser = this.currentUserValue;
        const dataChanged = JSON.stringify(currentUser) !== JSON.stringify(user);

        if (dataChanged) {
          console.log('🔄 User data updated from server');
          this.updateStoredUser(user);
        }
      },
      error: (error) => {
        console.warn('⚠️ Silent refresh failed:', error);
      }
    });
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

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    console.log('🔐 Attempting login for:', credentials.username);
    
    return this.http.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setSession(response.data.token, response.data.user);
          
          console.log('✅ Login successful');
          console.log('👤 User:', response.data.user.name);
          console.log('🎭 Role:', response.data.user.role);
          console.log('🔑 Route Access:', response.data.user.routeAccess);
          console.log('⚙️ System Access:', response.data.user.systemAccess);
        }
      }),
      catchError(error => {
        console.error('❌ Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.stopAutoRefresh();
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    console.log('👋 User logged out');
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;
    return !!(token && user);
  }

  // ============================================
  // ✅ ROUTE ACCESS CONTROL
  // ============================================

  /**
   * Check if user has access to a specific route
   * This is ONLY used for Angular route guards (navigation)
   * NOT used for HTTP API requests
   */
  hasRouteAccess(routeKey: string): boolean {
    const user = this.currentUserValue;
    
    if (!user) {
      console.warn('⚠️ No user found when checking route access');
      return false;
    }

    console.log(`🔍 Checking route access for: ${routeKey}`);
    console.log('User role:', user.role);

    // Super admins have access to everything
    if (user.role === 'super_admin') {
      console.log('✅ Super admin - access granted');
      return true;
    }

    // Admins have access to everything except user management
    if (user.role === 'admin') {
      const hasAccess = routeKey !== 'users';
      console.log(`${hasAccess ? '✅' : '❌'} Admin access: ${routeKey}`);
      return hasAccess;
    }

    // Secretariat has access to specific routes
    if (user.role === 'secretariat') {
      const hasAccess = this.SECRETARIAT_ROUTES.includes(routeKey);
      console.log(`${hasAccess ? '✅' : '❌'} Secretariat access: ${routeKey}`);
      return hasAccess;
    }

    // Employees check their routeAccess array
    if (user.role === 'employee') {
      // First check: Is this route allowed for employees at all?
      if (!this.ALLOWED_EMPLOYEE_ROUTES.includes(routeKey)) {
        console.warn(`⚠️ Route '${routeKey}' is NOT in allowed employee routes`);
        console.log('Allowed routes:', this.ALLOWED_EMPLOYEE_ROUTES);
        return false;
      }

      // Second check: Does this specific employee have access?
      const userRoutes = user.routeAccess || [];
      const hasAccess = userRoutes.includes(routeKey);
      
      if (hasAccess) {
        console.log(`✅ Employee has access to: ${routeKey}`);
      } else {
        console.warn(`❌ Employee does NOT have access to: ${routeKey}`);
        console.log('Employee routes:', userRoutes);
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

    if (user.role === 'super_admin') {
      return ['*']; // All routes
    }

    if (user.role === 'admin') {
      return ['*', '!users']; // All except users
    }

    if (user.role === 'secretariat') {
      return this.SECRETARIAT_ROUTES;
    }

    if (user.role === 'employee') {
      return user.routeAccess || [];
    }

    return [];
  }

  /**
   * Check if user has specific role(s)
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
    
    if (!user) {
      console.warn('⚠️ No user found');
      return false;
    }

    // Super admins always have system access
    if (user.role === 'super_admin') {
      return true;
    }

    if (!user.systemAccess) {
      console.warn('⚠️ No systemAccess object found');
      return false;
    }

    return user.systemAccess[accessKey] === true;
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  private setSession(token: string, user: User): void {
    // Ensure routeAccess exists
    if (!user.routeAccess) {
      user.routeAccess = [];
    }

    // Ensure systemAccess exists
    if (!user.systemAccess) {
      user.systemAccess = {};
    }

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      
      // Ensure routeAccess exists
      if (!user.routeAccess) {
        user.routeAccess = [];
      }

      // Ensure systemAccess exists
      if (!user.systemAccess) {
        user.systemAccess = {};
      }

      return user;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }

  updateStoredUser(user: User): void {
    // Ensure required fields exist
    if (!user.routeAccess) {
      user.routeAccess = [];
    }

    if (!user.systemAccess) {
      user.systemAccess = {};
    }

    console.log('💾 Updating stored user:', {
      name: user.name,
      role: user.role,
      systemAccess: user.systemAccess,
      routeAccess: user.routeAccess
    });

    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    console.log('✅ User data updated in storage');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

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

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(API_ENDPOINTS.AUTH.FORGET_PASSWORD, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      newPassword
    });
  }

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
   * Refresh user data from server
   */
  refreshUserData(): Observable<User> {
    const userId = this.currentUserValue?.id;
    
    if (!userId) {
      return throwError(() => new Error('No user ID available'));
    }

    console.log('🔄 Refreshing user data from server...');

    return this.http.get<any>(
      API_ENDPOINTS.USERS.ME,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.data),
      tap(user => {
        this.updateStoredUser(user);
        console.log('✅ User data refreshed:', {
          systemAccess: user.systemAccess,
          routeAccess: user.routeAccess
        });
      })
    );
  }

  /**
   * Force refresh user permissions
   */
  forceRefresh(): Observable<User> {
    return this.refreshUserData();
  }

  /**
   * Get the complete list of routes allowed for employees
   */
  getAllowedEmployeeRoutes(): string[] {
    return [...this.ALLOWED_EMPLOYEE_ROUTES];
  }

  /**
   * Check if a route is allowed for employees
   */
  isRouteAllowedForEmployees(routeKey: string): boolean {
    return this.ALLOWED_EMPLOYEE_ROUTES.includes(routeKey);
  }

  // ============================================
  // CLEANUP
  // ============================================

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }
}