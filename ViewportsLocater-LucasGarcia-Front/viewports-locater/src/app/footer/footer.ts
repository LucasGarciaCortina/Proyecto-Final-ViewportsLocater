import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

/**
 * Componente del pie de página.
 * Muestra enlaces de navegación, modales informativos de "Sobre nosotros" y "Contacto",
 * y el botón de logout si el usuario está autenticado.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class FooterComponent {
  currentYear = new Date().getFullYear(); // se calcula una vez al instanciar el componente

  readonly auth  = inject(AuthService);
  private router = inject(Router);

  // signals que controlan la visibilidad de los modales informativos
  modalSobreNosotros = signal(false);
  modalContacto      = signal(false);

  abrirSobreNosotros()  { this.modalSobreNosotros.set(true);  }
  cerrarSobreNosotros() { this.modalSobreNosotros.set(false); }
  abrirContacto()       { this.modalContacto.set(true);       }
  cerrarContacto()      { this.modalContacto.set(false);      }

  /**
   * Cierra la sesión del usuario.
   * La redirección al inicio la gestiona AuthService internamente.
   */
  logout() {
    this.auth.logout().subscribe();
  }
}
