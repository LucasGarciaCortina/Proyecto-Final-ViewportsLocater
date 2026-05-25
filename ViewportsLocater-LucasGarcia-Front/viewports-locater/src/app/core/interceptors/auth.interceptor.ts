import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor HTTP que añade automáticamente el token de autenticación
 * a todas las peticiones salientes si el usuario está logueado.
 * Evita tener que añadir la cabecera Authorization manualmente en cada servicio.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.token();

  if (token) {
    // clona la petición original añadiendo la cabecera Authorization con el token Bearer
    // se clona porque las peticiones HTTP son inmutables en Angular
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req); // pasa la petición (modificada o no) al siguiente manejador
};
