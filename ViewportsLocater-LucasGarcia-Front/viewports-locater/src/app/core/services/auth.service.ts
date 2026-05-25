import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../../models/user.interface';
import { MiradorService } from '../../services/mirador-service';

/**
 * Servicio de autenticación.
 * Gestiona el estado de sesión del usuario mediante signals reactivos,
 * persiste el token y los datos del usuario en localStorage,
 * y expone métodos para registro, login, logout y refresco de sesión.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // claves usadas para persistir la sesión en localStorage
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY  = 'auth_user';

  // signals privados que almacenan el estado de sesión; se inicializan desde localStorage
  private _user  = signal<User | null>(this.loadUser());
  private _token = signal<string | null>(this.loadToken());

  // signals públicos de solo lectura para que los componentes puedan suscribirse sin modificarlos
  readonly user      = this._user.asReadonly();
  readonly token     = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token()); // true si hay token activo
  readonly isAdmin    = computed(() => this._user()?.roles?.includes('admin') ?? false);

  // inject() en lugar de constructor para evitar dependencia circular con MiradorService
  private miradorService = inject(MiradorService);

  constructor(private http: HttpClient, private router: Router) { }

  /**
   * Registra un nuevo usuario y guarda la sesión automáticamente.
   */
  register(data: { name: string; email: string; password: string; password_confirmation: string }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(res => this.saveSession(res)) // guarda token y usuario al completarse el registro
    );
  }

  /**
   * Autentica al usuario y guarda la sesión automáticamente.
   */
  login(data: { email: string; password: string }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, data).pipe(
      tap(res => this.saveSession(res)) // guarda token y usuario al completarse el login
    );
  }

  /**
   * Cierra la sesión del usuario en el servidor y limpia el estado local.
   */
  logout() {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearSession())
    );
  }

  /**
   * Persiste el token y los datos del usuario en localStorage y actualiza los signals.
   * También carga los favoritos del usuario recién autenticado.
   */
  private saveSession(res: AuthResponse) {
    const user = { ...res.user, roles: res.roles }; // fusiona los roles en el objeto usuario
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._token.set(res.token);
    this._user.set(user);
    this.miradorService.cargarFavoritosIds(); // carga los favoritos del usuario tras autenticarse
  }

  /**
   * Elimina el token y los datos del usuario de localStorage y resetea los signals.
   * También limpia los favoritos cargados en memoria y redirige al inicio.
   */
  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.miradorService.favoritosIds.set(new Set()); // vacía el set de favoritos en memoria
    this.router.navigate(['/home']);
  }

  /**
   * Carga el token almacenado en localStorage al inicializar el servicio.
   */
  private loadToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Carga y deserializa los datos del usuario almacenados en localStorage.
   */
  private loadUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * Refresca los datos del usuario desde el servidor para sincronizar roles y permisos.
   * Si el usuario pierde el rol de admin mientras está en el panel de administración,
   * lo redirige automáticamente al inicio.
   * Si la petición falla (token expirado, etc.), cierra la sesión.
   */
  refreshSession(): void {
    if (!this._token()) return; // no hace nada si no hay sesión activa

    this.http.get<{ user: User; roles: string[] }>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (res) => {
        const wasAdmin  = this.isAdmin();
        const user      = { ...res.user, roles: res.roles };
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this._user.set(user);

        // detecta si el usuario perdió el rol de admin y estaba navegando en /admin
        const isNowAdmin = user.roles?.includes('admin') ?? false;
        if (wasAdmin && !isNowAdmin && this.router.url.startsWith('/admin')) {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.clearSession(); // si el token ya no es válido, cierra la sesión automáticamente
      },
    });
  }

  /**
   * Actualiza los datos del usuario en localStorage y en el signal,
   * útil tras editar el perfil sin necesidad de hacer logout y login.
   */
  updateUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }
}
