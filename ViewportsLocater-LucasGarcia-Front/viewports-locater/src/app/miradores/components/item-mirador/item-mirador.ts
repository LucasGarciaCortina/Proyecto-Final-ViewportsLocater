import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Mirador } from '../../../models/mirador.interface';
import { RatingWidgetComponent } from '../rating-widget/rating-widget.component';
import { AuthService } from '../../../core/services/auth.service';
import { MiradorService } from '../../../services/mirador-service';

/** Tipo que representa los datos mínimos de una ruta necesarios para la tarjeta */
type RutaApi = {
  distancia_km?: number | string;
  duracion_estimada_min?: number | string;
  dificultad?: string;
};

/** Tipo que representa los datos mínimos de una foto necesarios para la tarjeta */
type FotoApi = { url?: string };

/**
 * Componente de tarjeta de mirador.
 * Muestra un resumen del mirador con imagen, tags, valoración, distancia y dificultad.
 * Permite añadir/quitar de favoritos y navegar al detalle del mirador.
 */
@Component({
  selector: 'app-item-mirador',
  standalone: true,
  imports: [CommonModule, RouterLink, RatingWidgetComponent],
  templateUrl: './item-mirador.html',
  styleUrls: ['./item-mirador.css'],
})
export class ItemMiradorComponent {
  // input() signal permite que los computed reaccionen automáticamente cuando cambia el mirador
  readonly mirador   = input.required<Mirador>();
  readonly distancia = input<number | undefined>(undefined); // distancia del usuario al mirador en km, opcional

  private miradorService = inject(MiradorService);
  private authService    = inject(AuthService);
  private router         = inject(Router);

  widgetVisible    = signal(false); // controla la visibilidad del widget de valoración
  cargandoFavorito = signal(false); // evita múltiples clicks mientras se procesa la petición

  // se recalcula automáticamente cuando cambia favoritosIds o el mirador recibido
  readonly esFavorito = computed(() => this.miradorService.favoritosIds().has(this.mirador().id));

  /**
   * Alterna la visibilidad del widget de valoración.
   */
  toggleWidget(): void {
    this.widgetVisible.update((v) => !v);
  }

  /**
   * Devuelve el nombre de la provincia del mirador o null si no está disponible.
   */
  get provinciaNombre(): string | null {
    const p1: any = (this.mirador() as any).provincia?.nombre;
    if (typeof p1 === 'string' && p1.length) return p1;
    return null;
  }

  /**
   * Devuelve las rutas del mirador como array, o array vacío si no hay rutas.
   */
  private get rutas(): RutaApi[] {
    const r: any = (this.mirador() as any).rutas;
    return Array.isArray(r) ? r : [];
  }

  /**
   * Devuelve las fotos del mirador como array, o array vacío si no hay fotos.
   */
  private get fotos(): FotoApi[] {
    const f: any = (this.mirador() as any).fotos;
    return Array.isArray(f) ? f : [];
  }

  /**
   * Devuelve la URL de la primera foto del mirador, o null si no hay fotos.
   */
  get imageUrl(): string | null {
    const url = this.fotos[0]?.url;
    return typeof url === 'string' && url.length ? url : null;
  }

  /**
   * Devuelve la ruta con menor distancia para mostrar como ruta principal.
   * Si ninguna tiene distancia válida, devuelve la primera ruta disponible.
   */
  get rutaPrincipal(): RutaApi | null {
    if (this.rutas.length === 0) return null;

    // normaliza el valor de distancia_km a número o null si no es válido
    const norm = (v: any) => {
      const n = typeof v === 'string' ? Number(v) : v;
      return Number.isFinite(n) ? n : null;
    };

    let best: RutaApi | null = null;
    let bestDist: number | null = null;

    for (const r of this.rutas) {
      const d = norm(r.distancia_km);
      if (d === null) continue;
      if (bestDist === null || d < bestDist) {
        bestDist = d;
        best = r;
      }
    }

    return best ?? this.rutas[0]; // fallback a la primera ruta si ninguna tiene distancia
  }

  /**
   * Devuelve la distancia de la ruta principal formateada en km, o null si no está disponible.
   */
  get distanciaKm(): string | null {
    const r = this.rutaPrincipal;
    if (!r) return null;
    const raw: any = r.distancia_km;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (!Number.isFinite(n)) return null;
    return `${Math.round(n)} km`;
  }

  /**
   * Devuelve la dificultad de la primera ruta que la tenga definida, o null si ninguna la tiene.
   */
  get dificultad(): string | null {
    const rutas: any[] = (this.mirador() as any).rutas ?? [];
    if (!rutas.length) return null;
    for (const r of rutas) {
      const d = r?.dificultad;
      if (typeof d === 'string' && d.length) return d;
    }
    return null;
  }

  /**
   * Devuelve la valoración media del mirador redondeada a 1 decimal, o null si no hay valoraciones.
   */
  get mediaValoracion(): number | null {
    const avg = (this.mirador() as any).valoraciones_avg_puntuacion;
    if (avg == null) return null;
    return Math.round(parseFloat(avg) * 10) / 10;
  }

  /**
   * Devuelve los tags del mirador como array de strings.
   * Soporta tanto arrays de strings como arrays de objetos con propiedad 'nombre'.
   */
  get tags(): string[] {
    const raw: any = (this.mirador() as any).tags;
    if (!raw) return [];
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') return raw;
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
      return raw.map((t: any) => t?.nombre).filter((x: any) => typeof x === 'string' && x.length);
    }
    return [];
  }

  /**
   * Devuelve los primeros 3 tags para mostrar en la tarjeta sin desbordar el diseño.
   */
  get tagsVisibles(): string[] {
    return this.tags.slice(0, 3);
  }

  /**
   * Devuelve el número de tags que no se muestran por superar el límite de 3.
   */
  get tagsExtraCount(): number {
    return Math.max(0, this.tags.length - this.tagsVisibles.length);
  }

  /**
   * Devuelve la descripción del mirador truncada a 80 caracteres, o null si no hay descripción.
   */
  get descripcionCorta(): string | null {
    const d: any = (this.mirador() as any).descripcion;
    if (typeof d !== 'string' || !d.trim()) return null;
    const s = d.trim();
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
  }

  /**
   * Devuelve el array de segmentos de ruta para el routerLink del detalle del mirador.
   */
  detalleLink(): any[] {
    return ['/miradores', this.mirador().id];
  }

  /**
   * Devuelve la distancia del usuario al mirador formateada, o null si no está disponible.
   */
  get distanciaUsuarioLabel(): string | null {
    const d = this.distancia();
    if (d == null || !Number.isFinite(d)) return null;
    return `${d.toFixed(1)} km de distancia`;
  }

  /**
   * Añade o quita el mirador de favoritos según su estado actual.
   * Si el usuario no está autenticado, redirige al login.
   * stopPropagation evita que el click navegue al detalle del mirador.
   */
  toggleFavorito(event: Event): void {
    event.stopPropagation(); // evita que el click se propague a la tarjeta y navegue al detalle

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.cargandoFavorito()) return; // evita múltiples peticiones simultáneas

    this.cargandoFavorito.set(true);
    const id = this.mirador().id;

    if (this.esFavorito()) {
      this.miradorService.quitarFavorito(id).subscribe({
        next: () => this.cargandoFavorito.set(false),
        error: () => this.cargandoFavorito.set(false),
      });
    } else {
      this.miradorService.agregarFavorito(id).subscribe({
        next: () => this.cargandoFavorito.set(false),
        error: () => this.cargandoFavorito.set(false),
      });
    }
  }
}
