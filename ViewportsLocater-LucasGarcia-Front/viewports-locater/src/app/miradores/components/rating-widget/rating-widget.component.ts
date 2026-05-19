import { Component, Input, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MiradorService } from '../../../services/mirador-service';
import { Valoracion } from '../../../models/valoracion.interface';

@Component({
  selector: 'app-rating-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rating-widget.component.html',
  styleUrls: ['./rating-widget.component.css']
})
export class RatingWidgetComponent implements OnInit {
  @Input({ required: true }) miradorId!: number;

  valoracionCreada = output<Valoracion>();

  private miradorService = inject(MiradorService);

  valoraciones = signal<Valoracion[]>([]);
  cargando = signal(true);
  enviando = signal(false);
  error = signal<string | null>(null);
  errorEnvio = signal<string | null>(null);
  enviado = signal(false);

  starsSeleccionadas = signal(0);
  starsHover = signal(0);

  form = {
    comentario: '',
    puntuacion: 0,
  };

  readonly estrellas = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.cargarValoraciones();
  }

  get promedio(): number | null {
    const vals = this.valoraciones();
    if (!vals.length) return null;
    const sum = vals.reduce((acc, v) => acc + v.puntuacion, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }

  get total(): number {
    return this.valoraciones().length;
  }

  generarEstrellas(puntuacion: number): string {
    const llenas = Math.round(puntuacion);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }

  cargarValoraciones(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.miradorService.getValoraciones(this.miradorId).subscribe({
      next: (data) => {
        this.valoraciones.set(data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las valoraciones.');
        this.cargando.set(false);
      },
    });
  }

  seleccionarEstrella(n: number): void {
    this.starsSeleccionadas.set(n);
    this.form.puntuacion = n;
  }

  hoverEstrella(n: number): void {
    this.starsHover.set(n);
  }

  salirHoverEstrellas(): void {
    this.starsHover.set(0);
  }

  get caracteresRestantes(): number {
    return 500 - (this.form.comentario?.length ?? 0);
  }

  enviarValoracion(): void {
    if (this.form.puntuacion < 1 || this.form.puntuacion > 5) {
      this.errorEnvio.set('Por favor, selecciona una puntuación.');
      return;
    }

    this.errorEnvio.set(null);
    this.enviando.set(true);

    this.miradorService.crearValoracion(this.miradorId, {
      puntuacion: this.form.puntuacion,
      comentario: this.form.comentario.trim() || null,
    }).subscribe({
      next: (nueva) => {
        this.valoraciones.update(vals => [nueva, ...vals]);
        this.enviando.set(false);
        this.enviado.set(true);
        this.valoracionCreada.emit(nueva);
        this.form = { comentario: '', puntuacion: 0 };
        this.starsSeleccionadas.set(0);
        setTimeout(() => this.enviado.set(false), 3000);
      },
      error: () => {
        this.errorEnvio.set('No se pudo enviar la valoración. Inténtalo de nuevo.');
        this.enviando.set(false);
      },
    });
  }
}
