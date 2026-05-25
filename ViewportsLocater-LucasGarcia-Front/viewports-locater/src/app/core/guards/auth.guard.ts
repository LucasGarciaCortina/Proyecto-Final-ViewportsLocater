import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas que requieren autenticación.
 * Si el usuario no está logueado, redirige al login.
 */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  router.navigate(['/login']);
  return false;
};

/**
 * Guard que protege rutas exclusivas de administrador.
 * Fuerza un refresco de sesión desde el servidor antes de verificar el rol,
 * para evitar que un rol cacheado en localStorage dé acceso indebido.
 */
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // fuerza refresh para que el rol venga del servidor y no del localStorage cacheado
  auth.refreshSession();

  if (auth.isAdmin()) return true;

  router.navigate(['/home']); // redirige al inicio si no es administrador
  return false;
};
