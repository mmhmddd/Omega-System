// src/app/core/guards/auth.guard.ts - FIXED VERSION
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Authentication guard - checks if user is logged in and has access to route
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    console.warn('🔒 User not authenticated, redirecting to login');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const user = authService.currentUserValue;
  if (!user) {
    console.warn('🔒 No user data found, redirecting to login');
    router.navigate(['/login']);
    return false;
  }

  // Get route key and system access requirement from route data
  const routeKey = route.data['routeKey'] as string;
  const requiresSystemAccess = route.data['requiresSystemAccess'] as keyof typeof user.systemAccess;

  console.log('🔍 Auth Guard Check:', {
    route: state.url,
    routeKey,
    requiresSystemAccess,
    userRole: user.role,
    systemAccess: user.systemAccess,
    routeAccess: user.routeAccess
  });

  // If no route key specified, allow access (public authenticated route like dashboard)
  if (!routeKey) {
    console.log('✅ No route key required, allowing access');
    return true;
  }

  // Super admins have access to everything
  if (user.role === 'super_admin') {
    console.log('✅ Super admin access granted');
    return true;
  }

  // Admins have access to everything except user management
  if (user.role === 'admin') {
    if (routeKey === 'users') {
      console.warn('❌ Admin cannot access user management');
      router.navigate(['/dashboard']);
      return false;
    }
    console.log('✅ Admin access granted');
    return true;
  }

  // ✅ NEW: Check system access if required
  if (requiresSystemAccess) {
    const hasSystemAccess = authService.hasSystemAccess(requiresSystemAccess);
    
    if (!hasSystemAccess) {
      console.warn(`❌ User does not have system access: ${requiresSystemAccess}`);
      router.navigate(['/dashboard']);
      return false;
    }
    
    console.log(`✅ System access granted: ${requiresSystemAccess}`);
    
    // ✅ For routes with system access, we don't check routeAccess
    // System access is the primary permission
    return true;
  }

  // Secretariat has access to specific routes
  if (user.role === 'secretariat') {
    const secretariatRoutes = ['secretariat', 'secretariatUserManagement'];
    if (secretariatRoutes.includes(routeKey)) {
      console.log('✅ Secretariat access granted');
      return true;
    }
    console.warn(`❌ Secretariat does not have access to: ${routeKey}`);
    router.navigate(['/dashboard']);
    return false;
  }

  // Employees need to check routeAccess array
  if (user.role === 'employee') {
    const hasAccess = authService.hasRouteAccess(routeKey);
    
    if (hasAccess) {
      console.log(`✅ Employee has access to: ${routeKey}`);
      return true;
    }
    
    console.warn(`❌ Employee does not have access to: ${routeKey}`, {
      userRoutes: user.routeAccess,
      requestedRoute: routeKey
    });
    router.navigate(['/dashboard']);
    return false;
  }

  // Default: deny access
  console.warn('❌ Access denied - unknown role or condition');
  router.navigate(['/dashboard']);
  return false;
};

/**
 * Role-based guard for specific roles
 * Usage: canActivate: [roleGuard(['super_admin', 'admin'])]
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      console.warn('🔒 User not authenticated, redirecting to login');
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const user = authService.currentUserValue;
    if (!user) {
      console.warn('🔒 No user data found, redirecting to login');
      router.navigate(['/login']);
      return false;
    }

    if (!allowedRoles.includes(user.role)) {
      console.warn(`❌ Role '${user.role}' not in allowed roles:`, allowedRoles);
      router.navigate(['/dashboard']);
      return false;
    }

    console.log(`✅ Role guard passed for: ${user.role}`);
    return true;
  };
};