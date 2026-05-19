import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  readonly auth = inject(AuthService);
  private router = inject(Router);

  modalSobreNosotros = signal(false);
  modalContacto = signal(false);

  abrirSobreNosotros() { this.modalSobreNosotros.set(true); }
  cerrarSobreNosotros() { this.modalSobreNosotros.set(false); }
  abrirContacto() { this.modalContacto.set(true); }
  cerrarContacto() { this.modalContacto.set(false); }

  logout() {
    this.auth.logout().subscribe();
  }
}
