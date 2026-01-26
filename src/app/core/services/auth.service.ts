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
  role: string;
  active: boolean;
  systemAccess?: {
    laserCuttingManagement?: boolean;
  };
  routeAccess?: string[];
  lastLogin?: string;
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

  /**
   * Check if user is authenticated on service initialization
   */
  private checkAuthStatus(): void {
    const token = this.getToken();
    const user = this.getStoredUser();

    console.log('Checking auth status:', { token: !!token, user });

    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      this.isLoggedIn.set(true);
    }
  }

  /**
   * Login user
   */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password
    }).pipe(
      tap(response => {
        console.log('Login response:', response);
        if (response.success && response.data) {
          this.setSession(response.data);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Set authentication session
   */
  private setSession(authResult: { user: User; token: string }): void {
    console.log('Setting session with user:', authResult.user);

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
    console.log('Logging out user');

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.isLoggedIn.set(false);

    this.router.navigate(['/login']);
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get stored user
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing stored user:', error);
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
   * Get current user info from backend
   */
  getCurrentUser(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${API_ENDPOINTS.AUTH.LOGIN.replace('/login', '/me')}`).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Update stored user with fresh data from backend
          const user = response.data as User;
          localStorage.setItem('user', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      })
    );
  }

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

  /**
   * Check if user has access to a route
   */
  hasRouteAccess(routeKey: string): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    // Super admin and admin have access to everything
    if (user.role === 'super_admin' || user.role === 'admin') {
      return true;
    }

    // Secretariat has access to specific routes
    if (user.role === 'secretariat') {
      const secretariatRoutes = ['userForms', 'secretariat-user'];
      return secretariatRoutes.includes(routeKey);
    }

    // Employee needs to check routeAccess array
    if (user.role === 'employee') {
      return user.routeAccess?.includes(routeKey) || false;
    }

    return false;
  }

  /**
   * Check if user has system access
   */
  hasSystemAccess(systemName: string): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    if (user.role === 'super_admin') return true;

    return user.systemAccess?.[systemName as keyof typeof user.systemAccess] || false;
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
}
