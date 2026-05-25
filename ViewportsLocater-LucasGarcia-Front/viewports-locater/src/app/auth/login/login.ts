import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

/**
 * Componente de inicio de sesión.
 * Gestiona el formulario de login con validaciones en cliente
 * antes de enviar las credenciales al servidor.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // signals que actúan como estado reactivo del componente
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router, private location: Location) {}

  /**
   * Valida el formulario y envía las credenciales al servidor.
   * Si hay errores de validación los muestra sin llegar a hacer la petición.
   */
  onSubmit() {
    // validaciones ANTES de enviar para evitar peticiones innecesarias
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

    if (this.loading()) return; // evita múltiples envíos si ya hay una petición en curso

    this.error.set('');
    this.loading.set(true);

    this.auth.login({
      email: this.email(),
      password: this.password()
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/home']); // redirige al inicio tras login exitoso
      },
      error: (err) => {
        this.loading.set(false);

        if (err.error?.message) {
          this.error.set(err.error.message); // muestra el mensaje de error del servidor si existe
        } else if (err.status === 401 || err.status === 422) {
          this.error.set('Email o contraseña incorrectos'); // error genérico para no dar pistas sobre qué campo es incorrecto
        } else {
          this.error.set('Error al iniciar sesión. Intenta de nuevo.');
        }
      }
    });
  }

  /**
   * Valida el formato del email mediante expresión regular.
   */
  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // verifica que tenga formato usuario@dominio.extension
    return regex.test(email);
  }

  /**
   * Comprueba que todos los campos del formulario son válidos
   * para habilitar o deshabilitar el botón de envío.
   */
  isFormValid(): boolean {
    return this.email().length > 0 &&
           this.isValidEmail(this.email()) &&
           this.password().length > 0;
  }

  /**
   * Navega a la página anterior del historial del navegador.
   */
  volver(): void {
    this.location.back();
  }
}
