import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/**
 * Componente del menú de navegación principal.
 * Gestiona el dropdown del usuario, el logout y el cierre automático
 * del dropdown al hacer click fuera de él.
 */
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class MenuComponent {
  auth          = inject(AuthService);
  private router = inject(Router);

  dropdownOpen = signal(false); // controla la visibilidad del menú desplegable del usuario

  /**
   * Alterna el estado abierto/cerrado del dropdown.
   */
  toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v); // invierte el valor actual del signal
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  /**
   * Cierra la sesión, cierra el dropdown y redirige a la raíz.
   */
  logout(): void {
    this.auth.logout().subscribe(() => {
      this.closeDropdown();
      this.router.navigate(['/']);
    });
  }

  /**
   * Indica si la ruta actual es la página de inicio.
   * Se usa en el template para aplicar estilos específicos en home.
   */
  get esHome(): boolean {
    return this.router.url === '/home' || this.router.url === '/';
  }

  /**
   * Genera la URL del avatar del usuario usando el servicio ui-avatars.com,
   * que crea una imagen con las iniciales del nombre sobre fondo verde.
   */
  get userAvatar(): string {
    const name = this.auth.user()?.name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1D9E75&color=fff&bold=true`;
  }

  /**
   * Escucha clicks en todo el documento para cerrar el dropdown
   * cuando el usuario hace click fuera del menú de usuario.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // cierra el dropdown si el click se produjo fuera del elemento .user-menu
    const userMenu = document.querySelector('.user-menu');
    if (userMenu && !userMenu.contains(target)) {
      this.closeDropdown();
    }
  }
}
