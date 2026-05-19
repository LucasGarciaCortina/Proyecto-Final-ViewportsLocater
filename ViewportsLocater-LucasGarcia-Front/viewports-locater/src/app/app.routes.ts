import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./miradores/home/home').then(m => m.Home) },

  // Mirador
  { path: 'miradores/:id', loadComponent: () => import('./miradores/pages/detalle-mirador/detalle-mirador').then(m => m.DetalleMirador) },
  { path: 'miradores/:id/rutas/:rutaId', loadComponent: () => import('./miradores/pages/detalle-ruta/detalle-ruta').then(m => m.DetalleRutaComponent), canActivate: [authGuard] },

  // Crear/Editar Mirador
  { path: 'crear-mirador', loadComponent: () => import('./miradores/pages/crear-mirador/crear-mirador').then(m => m.CrearMiradorComponent), canActivate: [authGuard] },
  { path: 'crear-mirador/:id', loadComponent: () => import('./miradores/pages/crear-mirador/crear-mirador').then(m => m.CrearMiradorComponent), canActivate: [authGuard] },

  // Crear/Editar Ruta
  { path: 'miradores/:miradorId/crear-ruta', loadComponent: () => import('./miradores/pages/crear-ruta/crear-ruta').then(m => m.CrearRutaComponent), canActivate: [authGuard] },
  { path: 'miradores/:miradorId/crear-ruta/:id', loadComponent: () => import('./miradores/pages/crear-ruta/crear-ruta').then(m => m.CrearRutaComponent), canActivate: [authGuard] },

  // Favoritos
  {
    path: 'favoritos',
    loadComponent: () => import('./miradores/pages/favoritos/favoritos').then(m => m.FavoritosComponent),
    canActivate: [authGuard],
  },

  // Usuario
  { path: 'perfil', loadComponent: () => import('./miradores/pages/perfil/perfil').then(m => m.Perfil), canActivate: [authGuard] },

  // Admin
  { path: 'admin', loadComponent: () => import('./miradores/pages/admin/admin').then(m => m.Admin), canActivate: [authGuard, adminGuard] },

  // Auth
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register) },

  // Wildcard
  { path: '**', redirectTo: '/home' },
];
