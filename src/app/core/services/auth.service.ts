// src/app/core/services/auth.service.ts - CORRECTED VERSION
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, interval } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { API_ENDPOINTS } from '../constants/api-endpoints';

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

// ✅ CORRECTED: Changed from username to phone
export interface LoginCredentials {
  phone: string; // ✅ Changed from username to phone
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

  // ✅ Complete list matching backend (11 routes)
  private readonly ALLOWED_EMPLOYEE_ROUTES = [
    'suppliers',
    'itemsControl',
    'receipts',
    'rfqs',
    'purchases',
    'materialRequests',
    'priceQuotes',
    'proformaInvoice',
    'costingSheet',
    'secretariatUserManagement',
    'filesControl'
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

    console.log('✅ Auth Service Initialized');
    console.log('📋 Allowed Employee Routes:', this.ALLOWED_EMPLOYEE_ROUTES);

    this.startAutoRefresh();
  }

  // ============================================
  // AUTO-REFRESH USER DATA
  // ============================================

  private startAutoRefresh(): void {
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
    console.log('🔐 Attempting login with phone:', credentials.phone);
    
    return this.http.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setSession(response.data.token, response.data.user);
          
          console.log('✅ Login successful');
          console.log('👤 User:', response.data.user.name);
          console.log('📞 Phone:', response.data.user.phone);
          console.log('🎭 Role:', response.data.user.role);
          console.log('🔑 Route Access:', response.data.user.routeAccess);
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
  // ROUTE ACCESS CONTROL
  // ============================================

  hasRouteAccess(routeKey: string): boolean {
    const user = this.currentUserValue;
    
    if (!user) {
      console.warn('⚠️ No user found when checking route access');
      return false;
    }

    console.log(`🔍 Checking route access for: ${routeKey}`);

    if (user.role === 'super_admin') {
      return true;
    }

    if (user.role === 'admin') {
      return routeKey !== 'users';
    }

    if (user.role === 'secretariat') {
      return this.SECRETARIAT_ROUTES.includes(routeKey);
    }

    if (user.role === 'employee') {
      if (!this.ALLOWED_EMPLOYEE_ROUTES.includes(routeKey)) {
        console.warn(`⚠️ Route '${routeKey}' is NOT in allowed employee routes`);
        return false;
      }

      const userRoutes = user.routeAccess || [];
      const hasAccess = userRoutes.includes(routeKey);
      
      console.log(hasAccess ? `✅ Access granted` : `❌ Access denied`);
      return hasAccess;
    }

    return false;
  }

  getAccessibleRoutes(): string[] {
    const user = this.currentUserValue;
    
    if (!user) return [];
    if (user.role === 'super_admin') return ['*'];
    if (user.role === 'admin') return ['*', '!users'];
    if (user.role === 'secretariat') return this.SECRETARIAT_ROUTES;
    if (user.role === 'employee') return user.routeAccess || [];

    return [];
  }

  hasRole(role: string | string[]): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    if (Array.isArray(role)) {
      return role.includes(user.role);
    }

    return user.role === role;
  }

  hasSystemAccess(accessKey: keyof User['systemAccess']): boolean {
    const user = this.currentUserValue;
    
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (!user.systemAccess) return false;

    return user.systemAccess[accessKey] === true;
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  private setSession(token: string, user: User): void {
    if (!user.routeAccess) user.routeAccess = [];
    if (!user.systemAccess) user.systemAccess = {};

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      
      if (!user.routeAccess) user.routeAccess = [];
      if (!user.systemAccess) user.systemAccess = {};

      return user;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }

  updateStoredUser(user: User): void {
    if (!user.routeAccess) user.routeAccess = [];
    if (!user.systemAccess) user.systemAccess = {};

    console.log('💾 Updating stored user:', {
      name: user.name,
      phone: user.phone,
      role: user.role
    });

    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
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

  requestPasswordReset(emailOrPhone: string): Observable<any> {
    return this.http.post(API_ENDPOINTS.AUTH.FORGET_PASSWORD, { emailOrPhone });
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
        console.log('✅ User data refreshed');
      })
    );
  }

  forceRefresh(): Observable<User> {
    return this.refreshUserData();
  }

  getAllowedEmployeeRoutes(): string[] {
    return [...this.ALLOWED_EMPLOYEE_ROUTES];
  }

  isRouteAllowedForEmployees(routeKey: string): boolean {
    return this.ALLOWED_EMPLOYEE_ROUTES.includes(routeKey);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }
}