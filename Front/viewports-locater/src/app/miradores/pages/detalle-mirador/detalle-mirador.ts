import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MiradorService } from '../../../services/mirador-service';
import { MiradorDetalle } from '../../../models/mirador_detalle.interface';
import { Ruta } from '../../../models/ruta.interface';
import { Foto } from '../../../models/foto.interface';
import { Tag } from '../../../models/tag.interface';

@Component({
  selector: 'app-detalle-mirador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-mirador.html',
  styleUrls: ['./detalle-mirador.css']
})
export class DetalleMirador implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private miradorService = inject(MiradorService);

  detalle = signal<MiradorDetalle | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  fotoActual = signal(0);

  get fotos(): Foto[] {
    return this.detalle()?.fotos ?? [];
  }

  get rutas(): Ruta[] {
    return this.detalle()?.rutas ?? [];
  }

  get fotoPrincipalUrl(): string | null {
    const fotos = this.fotos;
    if (!fotos.length) return null;
    const idx = Math.min(this.fotoActual(), fotos.length - 1);
    return fotos[idx]?.url ?? null;
  }

  get tags(): string[] {
    const raw: Array<string | Tag> | undefined = (this.detalle()?.mirador as any)?.tags;
    if (!raw || !Array.isArray(raw)) return [];
    return raw
      .map((t) => (typeof t === 'string' ? t : t?.nombre))
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
  }

  get rutaPrincipal(): Ruta | null {
    const rutas = this.rutas;
    if (!rutas.length) return null;
    let best: Ruta | null = null;
    let bestDist: number | null = null;
    for (const r of rutas) {
      const d = r.distancia_km;
      if (d != null && (bestDist === null || d < bestDist)) {
        bestDist = d;
        best = r;
      }
    }
    return best ?? rutas[0];
  }

  formatDuracion(min: number | null): string {
    if (min == null) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.error.set('ID de mirador no válido');
      this.cargando.set(false);
      return;
    }

    this.miradorService.getMiradorById(id).subscribe({
      next: (data) => {
        this.detalle.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudo cargar el mirador.');
        this.cargando.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/home']);
  }

  fotoAnterior(): void {
    const len = this.fotos.length;
    if (!len) return;
    this.fotoActual.update(i => (i - 1 + len) % len);
  }

  fotoSiguiente(): void {
    const len = this.fotos.length;
    if (!len) return;
    this.fotoActual.update(i => (i + 1) % len);
  }

  irAFoto(idx: number): void {
    this.fotoActual.set(idx);
  }

  compartir(): void {
    if (navigator.share) {
      navigator.share({
        title: this.detalle()?.mirador?.nombre ?? 'Mirador',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  }
}
