// src/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Get token from localStorage (same as AuthService does)
  const token = localStorage.getItem('token');
  
  // Clone request and add Authorization header if token exists
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Token added to request:', req.url);
  } else {
    console.warn('⚠️ No token found for request:', req.url);
  }
  
  return next(req).pipe(
    catchError((error) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        console.error('🔒 Unauthorized! Token invalid or expired. Redirecting to login...');
        
        // Clear auth data (same as AuthService.logout())
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login
        router.navigate(['/login']);
      }
      
      // Handle 403 Forbidden errors
      if (error.status === 403) {
        console.error('🚫 Forbidden! Insufficient permissions.');
      }
      
      return throwError(() => error);
    })
  );
};