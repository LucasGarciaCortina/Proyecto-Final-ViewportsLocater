import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

/**
 * Componente de registro de nuevos usuarios.
 * Gestiona el formulario de registro con validaciones en cliente
 * antes de enviar los datos al servidor.
 */
@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // signals que actúan como estado reactivo del componente
  name = signal('');
  email = signal('');
  password = signal('');
  password_confirmation = signal('');
  error = signal('');
  loading = signal(false);
  formTouched = signal(false); // controla si el usuario ha intentado enviar el formulario al menos una vez

  constructor(private auth: AuthService, private router: Router, private location: Location) { }

  /**
   * Valida el formulario y envía los datos de registro al servidor.
   * Si hay errores de validación los muestra sin llegar a hacer la petición.
   */
  onSubmit() {
    this.formTouched.set(true); // marca el formulario como tocado para activar los mensajes de error visuales

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

    if (this.loading()) return; // evita múltiples envíos si ya hay una petición en curso
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
        this.router.navigate(['/home']); // redirige al inicio tras registro exitoso
      },
      error: (err) => {
        this.loading.set(false);

        if (err.error?.message) {
          this.error.set(err.error.message); // muestra el mensaje de error del servidor si existe
        } else if (err.error?.errors) {
          // Laravel devuelve los errores de validación como objeto; extrae el primer mensaje
          const errores = Object.values(err.error.errors).flat() as string[];
          this.error.set(errores[0] || 'Error al registrarse');
        } else {
          this.error.set('Error al registrarse. Intenta de nuevo.');
        }
      }
    });
  }

  /**
   * Comprueba que la contraseña tiene al menos 8 caracteres.
   */
  isPasswordValid(): boolean {
    return this.password().length >= 8;
  }

  /**
   * Comprueba que la confirmación de contraseña coincide con la contraseña
   * y que ambas tienen contenido.
   */
  isPasswordMatch(): boolean {
    return this.password() === this.password_confirmation() && this.password().length > 0;
  }

  /**
   * Comprueba que el nombre tiene al menos 3 caracteres ignorando espacios en los extremos.
   */
  isNameValid(): boolean {
    return this.name().trim().length >= 3;
  }

  /**
   * Comprueba que todos los campos del formulario son válidos
   * para habilitar o deshabilitar el botón de envío.
   */
  isFormValid(): boolean {
    return this.isNameValid() &&
      this.isValidEmail(this.email()) &&
      this.isPasswordValid() &&
      this.isPasswordMatch();
  }

  /**
   * Valida el formato del email mediante expresión regular.
   */
  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // verifica que tenga formato usuario@dominio.extension
    return regex.test(email);
  }

  /**
   * Navega a la página anterior del historial del navegador.
   */
  volver(): void {
    this.location.back();
  }
}
