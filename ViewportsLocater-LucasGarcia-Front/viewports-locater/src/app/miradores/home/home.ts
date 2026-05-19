import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';

import { MiradorService } from '../../services/mirador-service';
import { GeolocationService, UserPosition } from '../../services/geolocation.service';
import { Provincia } from '../../models/provincia.interface';
import { Mirador } from '../../models/mirador.interface';
import { Tag } from '../../models/tag.interface';
import { ItemMiradorComponent } from '../components/item-mirador/item-mirador';
import { UserLocationWidgetComponent } from '../components/user-location-widget/user-location-widget.component';
import { RouterLink } from '@angular/router';
import { MapaMiradoresnComponent } from '../components/mapa-miradores/mapa-miradores';
import { AuthService } from '../../core/services/auth.service';


type Orden = 'valoracion' | 'cercanos' | 'nombre' | 'dificultad';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ItemMiradorComponent, UserLocationWidgetComponent, RouterLink, MapaMiradoresnComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit {
  private miradorService = inject(MiradorService);
  private geoService = inject(GeolocationService);
  public auth = inject(AuthService);

  //Paginador
  paginaActual = signal(1);
  readonly POR_PAGINA = 9;

  miradores = signal<Mirador[]>([]);
  provincias = signal<Provincia[]>([]);
  /** Map of mirador id → distance in km from user */
  distancias = signal<Record<number, number>>({});
  valoracionMinima = signal(0);
  tagsDisponibles = signal<Tag[]>([]);
  selectedTagIds = signal<number[]>([]);

  cargando = signal(false);
  error = signal<string | null>(null);

  q = '';
  provinciaId: number | '' = '';
  dificultad: string | '' = '';
  orden = signal<'nombre' | 'nombre-desc' | 'valoracion' | 'dificultad' | 'cercanos'>('nombre');
  radioKm = 0;

  filtrosVisibles = signal(false);
  filtrosTagVisibles = signal(false);

  ngOnInit(): void {
    this.cargarProvincias();
    this.cargarTags();
    this.cargarMiradoresInicial();
    if (this.auth.isLoggedIn()) {
      this.miradorService.cargarFavoritosIds();
    }
  }

  cargarTags() {
    this.miradorService.getTags().subscribe({
      next: (data) => this.tagsDisponibles.set(data ?? []),
      error: (err) => {
        console.error(err);
        this.tagsDisponibles.set([]);
      }
    });
  }

  private cargarMiradoresInicial(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.miradorService.cargarMiradores().subscribe({
      next: (data) => {
        let lista = data ?? [];

        // Si no está logueado, mostrar solo los 6 mejores valorados
        if (!this.auth.isLoggedIn()) {
          lista = lista
            .sort((a, b) => {
              // Primero por valoración (mayor a menor)
              const valorA = a.valoraciones_avg_puntuacion ?? 0;
              const valorB = b.valoraciones_avg_puntuacion ?? 0;
              if (valorB !== valorA) return valorB - valorA;

              // Segundo por nombre (A-Z)
              return a.nombre.localeCompare(b.nombre);
            })
            .slice(0, 6); // Solo los primeros 6
        }

        this.miradores.set(lista);
        this.recalcularDistancias(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudieron cargar los miradores');
        this.cargando.set(false);
      },
    });
  }

  toggleFiltros() {
    this.filtrosVisibles.set(!this.filtrosVisibles());
  }

  toggleFiltrosTags() {
    this.filtrosTagVisibles.set(!this.filtrosTagVisibles());
  }

  isTagSelected(id: number) {
    return this.selectedTagIds().includes(id);
  }

  toggleTag(id: number) {
    const curr = this.selectedTagIds();
    this.selectedTagIds.set(curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  }

  clearTags() {
    this.selectedTagIds.set([]);
  }

  setValoracionMinima(estrellas: number) {
    this.valoracionMinima.set(estrellas);
  }

  clearValoracion() {
    this.valoracionMinima.set(0);
  }

  cargarProvincias() {
    this.miradorService.getProvincias().subscribe({
      next: (data) => this.provincias.set(data ?? []),
      error: (err) => {
        console.error(err);
        this.provincias.set([]);
      },
    });
  }

  async aplicarFiltros() {
    this.cargando.set(true);
    this.error.set(null);
    this.paginaActual.set(1);

    const texto = this.q.trim();
    const tagIds = this.selectedTagIds();
    const valoracionMin = this.valoracionMinima();
    const radioKm = this.radioKm;

    try {
      // Cargar TODOS los miradores con datos completos
      let base = await firstValueFrom(this.miradorService.cargarMiradores())
        .then(d => (d ?? []).filter(m => m?.id != null));

      // 1. Filter by distancia (NUEVO)
      if (radioKm > 0) {
        const pos = await this.geoService.getPosition();
        base = base.filter(m => {
          const distancia = this.geoService.getDistanceTo(m.latitud, m.longitud);
          return distancia !== null && distancia <= radioKm;
        });
      }

      // 2. Filter by valoración mínima
      if (valoracionMin > 0) {
        base = base.filter(m => {
          if (!m.valoraciones_avg_puntuacion || m.valoraciones_avg_puntuacion === null) {
            return false;
          }
          return m.valoraciones_avg_puntuacion >= valoracionMin;
        });
      }

      // 3. Filter by tags
      if (tagIds.length > 0) {
        base = base.filter(m =>
          tagIds.every(tagId => (m.tags?.some(t => t.id === tagId) ?? false))
        );
      }

      // 4. Filter by provincia
      if (this.provinciaId !== '') {
        base = base.filter(m => m.provincia_id === this.provinciaId);
      }

      // 5. Filter by dificultad
      if (this.dificultad !== '') {
        base = base.filter(m => {
          if (!m.rutas || m.rutas.length === 0) return false;
          let rutaPrincipal = null;
          let menorDist = null;
          for (const r of m.rutas) {
            const dist = parseFloat(r.distancia_km || 'NaN');
            if (Number.isFinite(dist)) {
              if (menorDist === null || dist < menorDist) {
                menorDist = dist;
                rutaPrincipal = r;
              }
            }
          }
          rutaPrincipal = rutaPrincipal || m.rutas[0];
          return rutaPrincipal?.dificultad === this.dificultad;
        });
      }

      // 6. Filter by text
      if (texto.length > 0) {
        const textoBusqueda = texto.toLowerCase();
        base = base.filter(m =>
          m.nombre.toLowerCase().includes(textoBusqueda) ||
          m.descripcion.toLowerCase().includes(textoBusqueda)
        );
      }

      // 7. APLICAR ORDENAMIENTO (CLIENT-SIDE con datos completos)
      let resultado = [...base];

      if (this.orden() === 'valoracion') {
        resultado.sort((a, b) => {
          const avgA = a.valoraciones_avg_puntuacion ?? 0;
          const avgB = b.valoraciones_avg_puntuacion ?? 0;
          return avgB - avgA; // Mayor a menor
        });
      } else if (this.orden() === 'dificultad') {
        const dificultadOrder = { 'facil': 1, 'media': 2, 'dificil': 3 };
        resultado.sort((a, b) => {
          const diffA = this.getDificultadRuta(a);
          const diffB = this.getDificultadRuta(b);
          return (dificultadOrder[diffA as keyof typeof dificultadOrder] ?? 0) -
            (dificultadOrder[diffB as keyof typeof dificultadOrder] ?? 0);
        });
      } else if (this.orden() === 'nombre-desc') {
        resultado.sort((a, b) => b.nombre.localeCompare(a.nombre));
      } else if (this.orden() === 'nombre') {
        resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
      } else if (this.orden() === 'cercanos') {
        const pos = await this.geoService.getPosition();
        resultado.sort((a, b) => {
          const distA = this.geoService.getDistanceTo(a.latitud, a.longitud) ?? Infinity;
          const distB = this.geoService.getDistanceTo(b.latitud, b.longitud) ?? Infinity;
          return distA - distB;
        });
      }

      this.miradores.set(resultado);
      this.recalcularDistancias(resultado);
      this.cargando.set(false);

    } catch (err) {
      console.error(err);
      this.error.set('Error aplicando filtros.');
      this.cargando.set(false);
    }
    this.filtrosVisibles.set(false);
  }

  // Método auxiliar para obtener la dificultad de una ruta
  private getDificultadRuta(mirador: Mirador): string {
    if (!mirador.rutas || mirador.rutas.length === 0) return '';

    let rutaPrincipal = null;
    let menorDist = null;

    for (const r of mirador.rutas) {
      const dist = parseFloat(r.distancia_km || 'NaN');
      if (Number.isFinite(dist)) {
        if (menorDist === null || dist < menorDist) {
          menorDist = dist;
          rutaPrincipal = r;
        }
      }
    }

    rutaPrincipal = rutaPrincipal || mirador.rutas[0];
    return rutaPrincipal?.dificultad ?? '';
  }

  onPosicionActualizada(pos: UserPosition) {
    this.recalcularDistancias(this.miradores());
  }

  private recalcularDistancias(lista: Mirador[]) {
    const map: Record<number, number> = {};
    for (const m of lista) {
      const d = this.geoService.getDistanceTo(m.latitud, m.longitud);
      if (d !== null) map[m.id] = d;
    }
    this.distancias.set(map);
  }

  getDistancia(id: number): number | undefined {
    return this.distancias()[id];
  }

  get miradoresFiltradosPorTexto(): Mirador[] {
    const texto = this.q.trim().toLowerCase();
    if (!texto) return this.miradores();
    return this.miradores().filter(m =>
      m.nombre.toLowerCase().includes(texto) ||
      m.descripcion?.toLowerCase().includes(texto)
    );
  }

  get miradoresPaginados() {
    const lista = this.miradoresFiltradosPorTexto;
    const inicio = (this.paginaActual() - 1) * this.POR_PAGINA;
    return lista.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginas() {
    return Math.ceil(this.miradoresFiltradosPorTexto.length / this.POR_PAGINA);
  }

  get paginas() {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  get paginasVisibles(): (number | '...')[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual();
    if (total <= 7) return this.paginas;

    const rango: (number | '...')[] = [];
    rango.push(1);

    if (actual > 3) rango.push('...');

    const inicio = Math.max(2, actual - 1);
    const fin = Math.min(total - 1, actual + 1);
    for (let i = inicio; i <= fin; i++) rango.push(i);

    if (actual < total - 2) rango.push('...');
    rango.push(total);

    return rango;
  }

  irAPagina(p: number) {
    this.paginaActual.set(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get resultadoInicial(): number {
    return this.miradoresFiltradosPorTexto.length > 0 ? (this.paginaActual() - 1) * this.POR_PAGINA + 1 : 0;
  }

  get resultadoFinal(): number {
    const fin = this.paginaActual() * this.POR_PAGINA;
    return fin > this.miradoresFiltradosPorTexto.length ? this.miradoresFiltradosPorTexto.length : fin;
  }

}
