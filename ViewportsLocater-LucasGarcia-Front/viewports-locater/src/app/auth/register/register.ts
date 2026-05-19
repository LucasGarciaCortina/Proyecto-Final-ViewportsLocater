import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  name = signal('');
  email = signal('');
  password = signal('');
  password_confirmation = signal('');
  error = signal('');
  loading = signal(false);
  formTouched = signal(false);

  constructor(private auth: AuthService, private router: Router) { }

  onSubmit() {
    this.formTouched.set(true);

    if (!this.isNameValid() || !this.email() || !this.password() || !this.password_confirmation()) {
      this.error.set('Todos los campos son requeridos');
      return;
    }

    if (this.password().length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (this.password() !== this.password_confirmation()) {
      this.error.set('Las contraseñas no coinciden');
      return;
    }

    if (!this.isValidEmail(this.email())) {
      this.error.set('Email inválido');
      return;
    }

    //  Si pasa validaciones, enviar
    if (this.loading()) return;
    this.error.set('');
    this.loading.set(true);

    this.auth.register({
      name: this.name(),
      email: this.email(),
      password: this.password(),
      password_confirmation: this.password_confirmation(),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading.set(false);

        //  Mostrar error del servidor
        if (err.error?.message) {
          this.error.set(err.error.message);
        } else if (err.error?.errors) {
          const errores = Object.values(err.error.errors).flat() as string[];
          this.error.set(errores[0] || 'Error al registrarse');
        } else {
          this.error.set('Error al registrarse. Intenta de nuevo.');
        }
      }
    });
  }

  isPasswordValid(): boolean {
    return this.password().length >= 8;
  }

  isPasswordMatch(): boolean {
    return this.password() === this.password_confirmation() && this.password().length > 0;
  }

  isNameValid(): boolean {
    return this.name().trim().length >= 3;
  }
  isFormValid(): boolean {
    return this.isNameValid() &&
      this.isValidEmail(this.email()) &&
      this.isPasswordValid() &&
      this.isPasswordMatch();
  }

  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
}
