import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';

/**
 * Configuración de rutas de la aplicación.
 * Todas las rutas usan carga diferida (loadComponent) para reducir el bundle inicial.
 * Las rutas protegidas usan authGuard y/o adminGuard para controlar el acceso.
 */
export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' }, // redirige la raíz al home

  { path: 'home', loadComponent: () => import('./miradores/home/home').then(m => m.Home) },

  // ── Mirador ────────────────────────────────────────────────────────────────
  {
    path: 'miradores/:id',
    loadComponent: () => import('./miradores/pages/detalle-mirador/detalle-mirador').then(m => m.DetalleMirador)
    // accesible sin autenticación para permitir compartir enlaces de miradores
  },
  {
    path: 'miradores/:id/rutas/:rutaId',
    loadComponent: () => import('./miradores/pages/detalle-ruta/detalle-ruta').then(m => m.DetalleRutaComponent),
    canActivate: [authGuard]
  },

  // ── Crear / Editar mirador ─────────────────────────────────────────────────
  // sin :id → modo creación; con :id → modo edición del mirador indicado
  {
    path: 'crear-mirador',
    loadComponent: () => import('./miradores/pages/crear-mirador/crear-mirador').then(m => m.CrearMiradorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'crear-mirador/:id',
    loadComponent: () => import('./miradores/pages/crear-mirador/crear-mirador').then(m => m.CrearMiradorComponent),
    canActivate: [authGuard]
  },

  // ── Crear / Editar ruta ────────────────────────────────────────────────────
  // sin :id → modo creación; con :id → modo edición de la ruta indicada
  {
    path: 'miradores/:miradorId/crear-ruta',
    loadComponent: () => import('./miradores/pages/crear-ruta/crear-ruta').then(m => m.CrearRutaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'miradores/:miradorId/crear-ruta/:id',
    loadComponent: () => import('./miradores/pages/crear-ruta/crear-ruta').then(m => m.CrearRutaComponent),
    canActivate: [authGuard]
  },

  // ── Favoritos ──────────────────────────────────────────────────────────────
  {
    path: 'favoritos',
    loadComponent: () => import('./miradores/pages/favoritos/favoritos').then(m => m.FavoritosComponent),
    canActivate: [authGuard],
  },

  // ── Perfil de usuario ──────────────────────────────────────────────────────
  {
    path: 'perfil',
    loadComponent: () => import('./miradores/pages/perfil/perfil').then(m => m.Perfil),
    canActivate: [authGuard]
  },

  // ── Panel de administración ────────────────────────────────────────────────
  // requiere tanto autenticación (authGuard) como rol de admin (adminGuard)
  {
    path: 'admin',
    loadComponent: () => import('./miradores/pages/admin/admin').then(m => m.Admin),
    canActivate: [authGuard, adminGuard]
  },

  // ── Autenticación ──────────────────────────────────────────────────────────
  { path: 'login',    loadComponent: () => import('./auth/login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },

  // ── Wildcard ───────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '/home' }, // redirige cualquier ruta no reconocida al home
];
