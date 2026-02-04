import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const user = authService.currentUserValue;
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // Get route key from route data
  const routeKey = route.data['routeKey'] as string;

  // If no route key specified, allow access (public authenticated route)
  if (!routeKey) {
    return true;
  }

  // Check if user has access to this route
  if (!authService.hasRouteAccess(routeKey)) {
    // Redirect to dashboard if no access
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

// Role-based guard for specific roles
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const user = authService.currentUserValue;
    if (!user || !allowedRoles.includes(user.role)) {
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  };
};
