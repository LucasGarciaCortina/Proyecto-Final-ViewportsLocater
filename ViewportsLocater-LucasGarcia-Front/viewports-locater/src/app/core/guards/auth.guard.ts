import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard: solo usuarios logueados
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  router.navigate(['/login']);
  return false;
};

// Guard: solo administradores — fuerza refresh de sesión antes de verificar
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Forzar refresh para que el rol venga del servidor, no solo del localStorage
  auth.refreshSession();

  if (auth.isAdmin()) return true;

  router.navigate(['/home']);
  return false;
};
