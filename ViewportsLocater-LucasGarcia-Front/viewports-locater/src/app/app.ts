import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MenuComponent } from './menu/menu';
import { FooterComponent } from './footer/footer';
import { ChatbotComponent } from './miradores/components/chatbot/chatbot';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { MiradorService } from './services/mirador-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MenuComponent, FooterComponent, ChatbotComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  protected readonly title = signal('viewports-locater');

  private router = inject(Router);
  private auth = inject(AuthService);
  private miradorService = inject(MiradorService);

  constructor() {
    if (this.auth.isLoggedIn()) {
      this.miradorService.cargarFavoritosIds();
    }

    // Refrescar roles en cada navegación para detectar cambios de rol aplicados por un admin
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.auth.refreshSession();
    });
  }

  showShell = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url !== '/')
    ),
    { initialValue: this.router.url !== '/' }
  );
}
