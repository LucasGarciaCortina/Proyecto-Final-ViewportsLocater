import { Component, Input, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MiradorService } from '../../../services/mirador-service';
import { Valoracion } from '../../../models/valoracion.interface';

/**
 * Componente de valoración de miradores.
 * Muestra el listado de valoraciones existentes, permite crear una nueva
 * mediante un formulario de estrellas y comentario, y emite un evento
 * al componente padre cuando se crea una valoración exitosamente.
 */
@Component({
  selector: 'app-rating-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rating-widget.component.html',
  styleUrls: ['./rating-widget.component.css']
})
export class RatingWidgetComponent implements OnInit {
  @Input({ required: true }) miradorId!: number;

  valoracionCreada = output<Valoracion>(); // evento que notifica al padre cuando se crea una valoración

  private miradorService = inject(MiradorService);

  // signals de estado del componente
  valoraciones  = signal<Valoracion[]>([]);
  cargando      = signal(true);
  enviando      = signal(false);
  error         = signal<string | null>(null);
  errorEnvio    = signal<string | null>(null);
  enviado       = signal(false); // controla el mensaje de confirmación temporal tras enviar

  starsSeleccionadas = signal(0); // puntuación seleccionada por el usuario
  starsHover         = signal(0); // estrella sobre la que está el cursor, para el efecto hover

  form = {
    comentario: '',
    puntuacion: 0,
  };

  readonly estrellas = [1, 2, 3, 4, 5]; // array fijo para iterar en el template

  ngOnInit(): void {
    this.cargarValoraciones();
  }

  /**
   * Calcula la puntuación media de todas las valoraciones cargadas,
   * redondeada a 1 decimal. Devuelve null si no hay valoraciones.
   */
  get promedio(): number | null {
    const vals = this.valoraciones();
    if (!vals.length) return null;
    const sum = vals.reduce((acc, v) => acc + v.puntuacion, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }

  /**
   * Devuelve el número total de valoraciones cargadas.
   */
  get total(): number {
    return this.valoraciones().length;
  }

  /**
   * Genera una cadena de estrellas llenas y vacías para representar una puntuación visualmente.
   */
  generarEstrellas(puntuacion: number): string {
    const llenas = Math.round(puntuacion);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }

  /**
   * Carga las valoraciones del mirador desde el servidor.
   */
  cargarValoraciones(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.miradorService.getValoraciones(this.miradorId).subscribe({
      next: (data) => {
        this.valoraciones.set(data ?? []); // usa array vacío si la respuesta es null/undefined
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las valoraciones.');
        this.cargando.set(false);
      },
    });
  }

  /**
   * Establece la puntuación seleccionada al hacer click en una estrella.
   */
  seleccionarEstrella(n: number): void {
    this.starsSeleccionadas.set(n);
    this.form.puntuacion = n;
  }

  /**
   * Actualiza la estrella resaltada al pasar el cursor por encima.
   */
  hoverEstrella(n: number): void {
    this.starsHover.set(n);
  }

  /**
   * Resetea el efecto hover al salir del área de estrellas.
   */
  salirHoverEstrellas(): void {
    this.starsHover.set(0);
  }

  /**
   * Devuelve el número de caracteres restantes permitidos en el comentario.
   */
  get caracteresRestantes(): number {
    return 500 - (this.form.comentario?.length ?? 0);
  }

  /**
   * Envía la valoración al servidor.
   * Añade la nueva valoración al principio de la lista sin recargar,
   * emite el evento al padre y muestra un mensaje de confirmación durante 3 segundos.
   */
  enviarValoracion(): void {
    if (this.form.puntuacion < 1 || this.form.puntuacion > 5) {
      this.errorEnvio.set('Por favor, selecciona una puntuación.');
      return;
    }

    this.errorEnvio.set(null);
    this.enviando.set(true);

    this.miradorService.crearValoracion(this.miradorId, {
      puntuacion: this.form.puntuacion,
      comentario: this.form.comentario.trim() || null, // envía null si el comentario está vacío
    }).subscribe({
      next: (nueva) => {
        this.valoraciones.update(vals => [nueva, ...vals]); // inserta la nueva valoración al inicio de la lista
        this.enviando.set(false);
        this.enviado.set(true);
        this.valoracionCreada.emit(nueva); // notifica al componente padre
        this.form = { comentario: '', puntuacion: 0 }; // resetea el formulario
        this.starsSeleccionadas.set(0);
        setTimeout(() => this.enviado.set(false), 3000); // oculta el mensaje de confirmación tras 3 segundos
      },
      error: () => {
        this.errorEnvio.set('No se pudo enviar la valoración. Inténtalo de nuevo.');
        this.enviando.set(false);
      },
    });
  }
}
