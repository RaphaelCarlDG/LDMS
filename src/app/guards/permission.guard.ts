import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { User, UserPermissions, UserRole } from '../models';

/** Redirects to dashboard when the user lacks a Firestore permission flag. */
export function permissionGuard(perm: keyof UserPermissions): CanActivateFn {
  return () => {
    const router = inject(Router);
    const userService = inject(UserService);

    return userService.currentUser$.pipe(
      filter((u): u is User => u !== null),
      take(1),
      map((u) => (u.permissions[perm] ? true : router.createUrlTree(['/app/dashboard']))),
    );
  };
}

/** Redirects to dashboard when the user's role is not in the allowed list. */
export function roleGuard(roles: UserRole[]): CanActivateFn {
  return () => {
    const router = inject(Router);
    const userService = inject(UserService);

    return userService.currentUser$.pipe(
      filter((u): u is User => u !== null),
      take(1),
      map((u) => (roles.includes(u.role) ? true : router.createUrlTree(['/app/dashboard']))),
    );
  };
}
