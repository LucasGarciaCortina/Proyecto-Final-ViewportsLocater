import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../../models/user.interface';
import { MiradorService } from '../../services/mirador-service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  // Signals reactivos
  private _user = signal<User | null>(this.loadUser());
  private _token = signal<string | null>(this.loadToken());

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());
  readonly isAdmin = computed(() => this._user()?.roles?.includes('admin') ?? false);

  // inject() en lugar de constructor para evitar dependencia circular
  private miradorService = inject(MiradorService);

  constructor(private http: HttpClient, private router: Router) { }

  register(data: { name: string; email: string; password: string; password_confirmation: string }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(res => this.saveSession(res))
    );
  }

  login(data: { email: string; password: string }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, data).pipe(
      tap(res => this.saveSession(res))
    );
  }

  logout() {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(
      tap(() => this.clearSession())
    );
  }

  private saveSession(res: AuthResponse) {
    const user = { ...res.user, roles: res.roles };
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._token.set(res.token);
    this._user.set(user);
    // Cargar favoritos del usuario recién logueado
    this.miradorService.cargarFavoritosIds();
  }

  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._token.set(null);
    this._user.set(null);
    // Limpiar favoritos al cerrar sesión
    this.miradorService.favoritosIds.set(new Set());
    this.router.navigate(['/home']);
  }

  private loadToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  refreshSession(): void {
    if (!this._token()) return;
    this.http.get<{ user: User; roles: string[] }>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (res) => {
        const wasAdmin = this.isAdmin();
        const user = { ...res.user, roles: res.roles };
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this._user.set(user);

        // Si perdió el rol de admin y está en /admin, redirigir a home
        const isNowAdmin = user.roles?.includes('admin') ?? false;
        if (wasAdmin && !isNowAdmin && this.router.url.startsWith('/admin')) {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.clearSession();
      },
    });
  }

  updateUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }
}
