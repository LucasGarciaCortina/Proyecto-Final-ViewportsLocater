import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Mirador } from '../../../models/mirador.interface';


type RutaApi = {
  distancia_km?: number | string;
  duracion_estimada_min?: number | string;
  dificultad?: string;
};

type FotoApi = { url?: string };

@Component({
  selector: 'app-item-mirador',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './item-mirador.html',
  styleUrls : ['./item-mirador.css']
})
export class ItemMiradorComponent {
  @Input({ required: true }) mirador!: Mirador;

  // ===== Helpers para leer tu JSON sin romper =====

  get provinciaNombre(): string | null {
    const p: any = (this.mirador as any).provincia?.nombre;
    return typeof p === 'string' && p.length ? p : null;
  }

  private get rutas(): RutaApi[] {
    const r: any = (this.mirador as any).rutas;
    return Array.isArray(r) ? r : [];
  }

  private get fotos(): FotoApi[] {
    const f: any = (this.mirador as any).fotos;
    return Array.isArray(f) ? f : [];
  }

  // Imagen principal (primera foto)
  get imageUrl(): string | null {
    const url = this.fotos[0]?.url;
    return typeof url === 'string' && url.length ? url : null;
  }

  // Ruta principal: la de menor distancia_km
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

    // si ninguna tiene distancia válida, usa la primera
    return best ?? this.rutas[0];
  }

  // Badge distancia (km) para la tarjeta
  get distanciaKm(): string | null {
    const r = this.rutaPrincipal;
    if (!r) return null;

    const raw: any = r.distancia_km;
    const n = typeof raw === 'string' ? Number(raw) : raw;

    if (!Number.isFinite(n)) return null;

    // en tu captura sale entero, aquí lo redondeo como UI típica
    return `${Math.round(n)} km`;
  }

  // Dificultad (Fácil/Moderada/Difícil…)
  get dificultad(): string | null {
    const d: any = this.rutaPrincipal?.dificultad;
    return typeof d === 'string' && d.length ? d : null;
  }

  // Tags si existen: tags: [{id,nombre}] o tags: string[]
  get tags(): string[] {
    const raw: any = (this.mirador as any).tags;
    if (!raw) return [];

    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'string') return raw;

    if (Array.isArray(raw) && raw.length && typeof raw[0] === 'object') {
      return raw
        .map((t: any) => t?.nombre)
        .filter((x: any) => typeof x === 'string' && x.length);
    }

    return [];
  }

  get tagsVisibles(): string[] {
    return this.tags.slice(0, 3);
  }

  get tagsExtraCount(): number {
    return Math.max(0, this.tags.length - this.tagsVisibles.length);
  }

  // Descripción corta
  get descripcionCorta(): string | null {
    const d: any = (this.mirador as any).descripcion;
    if (typeof d !== 'string' || !d.trim()) return null;

    const s = d.trim();
    return s.length > 80 ? s.slice(0, 80) + '…' : s;
  }

  detalleLink(): any[] {
    return ['/miradores', (this.mirador as any).id];
  }
}
