import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MenuComponent } from './menu/menu';
import { FooterComponent } from './footer/footer';
import { ChatbotComponent } from './miradores/components/chatbot/chatbot';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { MiradorService } from './services/mirador-service';

/**
 * Componente raíz de la aplicación.
 * Gestiona el shell de la aplicación (menú, footer y chatbot),
 * precarga los favoritos al iniciar si el usuario está autenticado,
 * y refresca la sesión en cada navegación para detectar cambios de rol.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuComponent, FooterComponent, ChatbotComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  protected readonly title = signal('viewports-locater');

  private router         = inject(Router);
  private auth           = inject(AuthService);
  private miradorService = inject(MiradorService);

  constructor() {
    // precarga los favoritos del usuario si ya está autenticado al cargar la app
    if (this.auth.isLoggedIn()) {
      this.miradorService.cargarFavoritosIds();
    }

    // refresca los roles del usuario en cada navegación para detectar
    // cambios de rol aplicados por un administrador desde otra sesión
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.auth.refreshSession();
    });
  }

  /**
   * Signal que indica si se debe mostrar el shell (menú, footer y chatbot).
   * Se oculta únicamente en la ruta raíz '/'.
   * Se convierte a signal con toSignal para integrarse con el sistema reactivo de Angular.
   */
  showShell = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url !== '/')
    ),
    { initialValue: this.router.url !== '/' } // valor inicial calculado antes del primer evento de navegación
  );
}
