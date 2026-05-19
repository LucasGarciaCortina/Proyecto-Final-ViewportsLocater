import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Mirador } from '../../../models/mirador.interface';
import { RatingWidgetComponent } from '../rating-widget/rating-widget.component';
import { AuthService } from '../../../core/services/auth.service';
import { MiradorService } from '../../../services/mirador-service';

type RutaApi = {
  distancia_km?: number | string;
  duracion_estimada_min?: number | string;
  dificultad?: string;
};

type FotoApi = { url?: string };

@Component({
  selector: 'app-item-mirador',
  standalone: true,
  imports: [CommonModule, RouterLink, RatingWidgetComponent],
  templateUrl: './item-mirador.html',
  styleUrls: ['./item-mirador.css'],
})
export class ItemMiradorComponent {
  // input() signal — permite que los computed reaccionen cuando cambia el mirador
  readonly mirador = input.required<Mirador>();
  readonly distancia = input<number | undefined>(undefined);

  private miradorService = inject(MiradorService);
  private authService = inject(AuthService);
  private router = inject(Router);

  widgetVisible = signal(false);
  cargandoFavorito = signal(false);

  // Reactivo: se actualiza solo cuando cambia favoritosIds o el mirador recibido
  readonly esFavorito = computed(() => this.miradorService.favoritosIds().has(this.mirador().id));

  toggleWidget(): void {
    this.widgetVisible.update((v) => !v);
  }

  get provinciaNombre(): string | null {
    const p1: any = (this.mirador() as any).provincia?.nombre;
    if (typeof p1 === 'string' && p1.length) return p1;
    return null;
  }

  private get rutas(): RutaApi[] {
    const r: any = (this.mirador() as any).rutas;
    return Array.isArray(r) ? r : [];
  }

  private get fotos(): FotoApi[] {
    const f: any = (this.mirador() as any).fotos;
    return Array.isArray(f) ? f : [];
  }

  get imageUrl(): string | null {
    const url = this.fotos[0]?.url;
    return typeof url === 'string' && url.length ? url : null;
  }

  get rutaPrincipal(): RutaApi | null {
    if (this.rutas.length === 0) return null;

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

    return best ?? this.rutas[0];
  }

  get distanciaKm(): string | null {
    const r = this.rutaPrincipal;
    if (!r) return null;
    const raw: any = r.distancia_km;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (!Number.isFinite(n)) return null;
    return `${Math.round(n)} km`;
  }

  get dificultad(): string | null {
    const rutas: any[] = (this.mirador() as any).rutas ?? [];
    if (!rutas.length) return null;
    for (const r of rutas) {
      const d = r?.dificultad;
      if (typeof d === 'string' && d.length) return d;
    }
    return null;
  }

  get mediaValoracion(): number | null {
    const avg = (this.mirador() as any).valoraciones_avg_puntuacion;
    if (avg == null) return null;
    return Math.round(parseFloat(avg) * 10) / 10;
  }

  get tags(): string[] {
    const raw: any = (this.mirador() as any).tags;
    if (!raw) return [];
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') return raw;
    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
      return raw.map((t: any) => t?.nombre).filter((x: any) => typeof x === 'string' && x.length);
    }
    return [];
  }

  get tagsVisibles(): string[] {
    return this.tags.slice(0, 3);
  }

  get tagsExtraCount(): number {
    return Math.max(0, this.tags.length - this.tagsVisibles.length);
  }

  get descripcionCorta(): string | null {
    const d: any = (this.mirador() as any).descripcion;
    if (typeof d !== 'string' || !d.trim()) return null;
    const s = d.trim();
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
  }

  detalleLink(): any[] {
    return ['/miradores', this.mirador().id];
  }

  get distanciaUsuarioLabel(): string | null {
    const d = this.distancia();
    if (d == null || !Number.isFinite(d)) return null;
    return `${d.toFixed(1)} km de distancia`;
  }

  toggleFavorito(event: Event): void {
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.cargandoFavorito()) return;

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
