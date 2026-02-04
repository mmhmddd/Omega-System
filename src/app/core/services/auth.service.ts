// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import API_ENDPOINTS from '../constants/api-endpoints';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'employee' | 'secretariat';
  active: boolean;
  systemAccess?: {
    laserCuttingManagement?: boolean;
  };
  routeAccess?: string[];
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Signal for reactive state
  isLoggedIn = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkAuthStatus();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Check if user is authenticated on service initialization
   */
  private checkAuthStatus(): void {
    const token = this.getToken();
    const user = this.getStoredUser();

    if (token && user) {
      console.log('🔐 Auth Service initialized with user:', {
        name: user.name,
        role: user.role,
        routeAccess: user.routeAccess || []
      });

      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      this.isLoggedIn.set(true);
    } else {
      console.log('⚠️ No authenticated user found');
    }
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Login user (supports both username and email)
   */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          const { user, token } = response.data;

          console.log('✅ Login successful:', {
            name: user.name,
            role: user.role,
            routeAccess: user.routeAccess || []
          });

          this.setSession(response.data);
        }
      }),
      catchError(error => {
        console.error('❌ Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Set authentication session
   */
  private setSession(authResult: { user: User; token: string }): void {
    // Ensure routeAccess is always an array
    if (!authResult.user.routeAccess) {
      authResult.user.routeAccess = [];
    }

    console.log('💾 Setting session for user:', authResult.user.name);

    localStorage.setItem('token', authResult.token);
    localStorage.setItem('user', JSON.stringify(authResult.user));

    this.currentUserSubject.next(authResult.user);
    this.isAuthenticatedSubject.next(true);
    this.isLoggedIn.set(true);
  }

  /**
   * Logout user
   */
  logout(): void {
    console.log('🚪 Logging out user');

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isLoggedIn.set(false);

    this.router.navigate(['/login']);
  }

  // ============================================
  // USER DATA
  // ============================================

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;

      const user = JSON.parse(userStr);

      // ✅ Ensure routeAccess is always an array
      if (!user.routeAccess) {
        user.routeAccess = [];
      }

      return user;
    } catch (error) {
      console.error('❌ Error parsing stored user:', error);
      return null;
    }
  }

  /**
   * Get current user value
   */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get current user info from backend (refresh user data)
   */
  getCurrentUser(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${API_ENDPOINTS.AUTH.LOGIN.replace('/login', '/me')}`).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Update stored user with fresh data from backend
          const user = response.data as User;

          // Ensure routeAccess is an array
          if (!user.routeAccess) {
            user.routeAccess = [];
          }

          console.log('🔄 User data refreshed:', {
            name: user.name,
            role: user.role,
            routeAccess: user.routeAccess
          });

          localStorage.setItem('user', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      })
    );
  }

  /**
   * Refresh user data (useful after updating permissions)
   */
  refreshUser(): void {
    const user = this.getStoredUser();
    if (user) {
      console.log('🔄 Refreshing user data:', {
        name: user.name,
        role: user.role,
        routeAccess: user.routeAccess
      });
      this.currentUserSubject.next(user);
    }
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  /**
   * Forgot password
   */
  forgotPassword(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.AUTH.FORGET_PASSWORD, { email });
  }

  /**
   * Reset password
   */
  resetPassword(token: string, newPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      newPassword
    });
  }

  /**
   * Change password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword
    });
  }

  // ============================================
  // ROUTE ACCESS CONTROL (FIXED)
  // ============================================

  /**
   * ✅ ENHANCED: Check if user has access to a specific route
   * This is the core method used by guards and dashboard
   */
  hasRouteAccess(routeKey: string): boolean {
    const user = this.currentUserValue;

    if (!user) {
      console.warn('⚠️ No user found for route access check');
      return false;
    }

    // ✅ Super admin has access to everything
    if (user.role === 'super_admin') {
      console.log(`✅ Super admin → Full access to: ${routeKey}`);
      return true;
    }

    // ✅ Admin has access to everything EXCEPT user management
    if (user.role === 'admin') {
      if (routeKey === 'users') {
        console.log(`❌ Admin → No access to: ${routeKey}`);
        return false;
      }
      console.log(`✅ Admin → Access granted to: ${routeKey}`);
      return true;
    }

    // ✅ Secretariat has access to specific routes
    if (user.role === 'secretariat') {
      const secretariatRoutes = [
        'secretariat',
        'secretariatUserManagement',
        'secretariat-user'  // Keep for backward compatibility
      ];

      const hasAccess = secretariatRoutes.includes(routeKey);
      console.log(`${hasAccess ? '✅' : '❌'} Secretariat → ${routeKey}: ${hasAccess}`);
      return hasAccess;
    }

    // ✅ Employee checks routeAccess array (THIS IS THE KEY PART)
    if (user.role === 'employee') {
      const routeAccess = user.routeAccess || [];

      console.log('🔍 Employee route check:', {
        routeKey,
        userRouteAccess: routeAccess,
        hasAccess: routeAccess.includes(routeKey)
      });

      const hasAccess = routeAccess.includes(routeKey);

      if (!hasAccess) {
        console.warn(`❌ Employee "${user.name}" does NOT have access to: ${routeKey}`);
        console.log(`   Current route access:`, routeAccess);
      } else {
        console.log(`✅ Employee "${user.name}" HAS access to: ${routeKey}`);
      }

      return hasAccess;
    }

    console.warn(`⚠️ Unknown role: ${user.role} for route: ${routeKey}`);
    return false;
  }

  // ============================================
  // SYSTEM ACCESS CONTROL
  // ============================================

  /**
   * Check if user has system access (like laser cutting)
   */
  hasSystemAccess(systemName: string): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    // Super admin has all system access
    if (user.role === 'super_admin') {
      return true;
    }

    // Check specific system access
    return user.systemAccess?.[systemName as keyof typeof user.systemAccess] || false;
  }

  // ============================================
  // HTTP HEADERS
  // ============================================

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
  // DEBUGGING UTILITIES
  // ============================================

  /**
   * ✅ Debug method to check route access for all routes
   * Useful for troubleshooting permission issues
   */
  debugRouteAccess(routes: string[]): void {
    const user = this.currentUserValue;
    if (!user) {
      console.log('❌ No user logged in');
      return;
    }

    console.log('==========================================');
    console.log('🔍 ROUTE ACCESS DEBUG');
    console.log('User:', user.name);
    console.log('Role:', user.role);
    console.log('Route Access Array:', user.routeAccess || []);
    console.log('------------------------------------------');

    routes.forEach(route => {
      const hasAccess = this.hasRouteAccess(route);
      console.log(`${hasAccess ? '✅' : '❌'} ${route}`);
    });

    console.log('==========================================');
  }

  /**
   * Get user role display name
   */
  getRoleDisplayName(): string {
    const user = this.currentUserValue;
    if (!user) return '';

    const roleNames: { [key: string]: string } = {
      'super_admin': 'مدير النظام',
      'admin': 'مدير',
      'employee': 'موظف',
      'secretariat': 'سكرتارية'
    };

    return roleNames[user.role] || user.role;
  }
}
