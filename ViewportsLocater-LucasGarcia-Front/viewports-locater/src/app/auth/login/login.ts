import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    // Validaciones ANTES de enviar
    if (!this.email()) {
      this.error.set('Por favor ingresa tu email');
      return;
    }

    if (!this.isValidEmail(this.email())) {
      this.error.set('El email no es válido');
      return;
    }

    if (!this.password()) {
      this.error.set('Por favor ingresa tu contraseña');
      return;
    }

    if (this.loading()) return;

    this.error.set('');
    this.loading.set(true);

    this.auth.login({
      email: this.email(),
      password: this.password()
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading.set(false);

        if (err.error?.message) {
          this.error.set(err.error.message);
        } else if (err.status === 401 || err.status === 422) {
          this.error.set('Email o contraseña incorrectos');
        } else {
          this.error.set('Error al iniciar sesión. Intenta de nuevo.');
        }
      }
    });
  }

  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  isFormValid(): boolean {
    return this.email().length > 0 &&
           this.isValidEmail(this.email()) &&
           this.password().length > 0;
  }
}
