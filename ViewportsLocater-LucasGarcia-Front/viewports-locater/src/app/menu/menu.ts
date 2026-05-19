import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class MenuComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  dropdownOpen = signal(false);

  toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.closeDropdown();
      this.router.navigate(['/']);
    });
  }

  get esHome(): boolean {
    return this.router.url === '/home' || this.router.url === '/';
  }

  get userAvatar(): string {
    const name = this.auth.user()?.name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1D9E75&color=fff&bold=true`;
  }

  // Al hacer click fuera del desplegable este se cierra
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Si el click es fuera del user-menu, cerrar el dropdown
    const userMenu = document.querySelector('.user-menu');
    if (userMenu && !userMenu.contains(target)) {
      this.closeDropdown();
    }
  }
}
