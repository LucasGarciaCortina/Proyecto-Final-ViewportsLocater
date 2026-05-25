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

/** Tipo que define las opciones de ordenamiento disponibles */
type Orden = 'valoracion' | 'cercanos' | 'nombre' | 'dificultad';

/**
 * Componente de la página principal.
 * Muestra el listado de miradores con filtros, ordenamiento, paginación
 * y mapa interactivo. Los usuarios no autenticados solo ven los 6 mejores valorados.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ItemMiradorComponent, UserLocationWidgetComponent, RouterLink, MapaMiradoresnComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit {
  private miradorService = inject(MiradorService);
  private geoService     = inject(GeolocationService);
  public auth            = inject(AuthService);

  // paginación
  paginaActual    = signal(1);
  readonly POR_PAGINA = 9; // número de miradores por página

  miradores        = signal<Mirador[]>([]);
  provincias       = signal<Provincia[]>([]);
  distancias       = signal<Record<number, number>>({}); // mapa de id de mirador → distancia en km desde el usuario
  valoracionMinima = signal(0);
  tagsDisponibles  = signal<Tag[]>([]);
  selectedTagIds   = signal<number[]>([]);

  cargando = signal(false);
  error    = signal<string | null>(null);

  // valores de los filtros del formulario
  q          = '';
  provinciaId: number | '' = '';
  dificultad: string | '' = '';
  orden      = signal<'nombre' | 'nombre-desc' | 'valoracion' | 'dificultad' | 'cercanos'>('nombre');
  radioKm    = 0;

  // signals que controlan la visibilidad de los paneles de filtros
  filtrosVisibles    = signal(false);
  filtrosTagVisibles = signal(false);

  ngOnInit(): void {
    this.cargarProvincias();
    this.cargarTags();
    this.cargarMiradoresInicial();
    if (this.auth.isLoggedIn()) {
      this.miradorService.cargarFavoritosIds(); // precarga los favoritos del usuario autenticado
    }
  }

  /**
   * Carga los tags disponibles para el filtro de etiquetas.
   */
  cargarTags() {
    this.miradorService.getTags().subscribe({
      next: (data) => this.tagsDisponibles.set(data ?? []),
      error: (err) => {
        console.error(err);
        this.tagsDisponibles.set([]);
      }
    });
  }

  /**
   * Carga los miradores al iniciar la página.
   * Los usuarios no autenticados solo ven los 6 mejores valorados como vista previa.
   */
  private cargarMiradoresInicial(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.miradorService.cargarMiradores().subscribe({
      next: (data) => {
        let lista = data ?? [];

        // usuarios no autenticados: muestra solo los 6 mejores valorados para incentivar el registro
        if (!this.auth.isLoggedIn()) {
          lista = lista
            .sort((a, b) => {
              const valorA = a.valoraciones_avg_puntuacion ?? 0;
              const valorB = b.valoraciones_avg_puntuacion ?? 0;
              if (valorB !== valorA) return valorB - valorA; // ordena por valoración descendente
              return a.nombre.localeCompare(b.nombre);       // desempate alfabético
            })
            .slice(0, 6);
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

  /** Comprueba si un tag está seleccionado en el filtro activo. */
  isTagSelected(id: number) {
    return this.selectedTagIds().includes(id);
  }

  /** Añade o elimina un tag del filtro activo según su estado actual. */
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

  /**
   * Carga la lista de provincias para el selector de filtro.
   */
  cargarProvincias() {
    this.miradorService.getProvincias().subscribe({
      next: (data) => this.provincias.set(data ?? []),
      error: (err) => {
        console.error(err);
        this.provincias.set([]);
      },
    });
  }

  /**
   * Aplica todos los filtros activos sobre la lista completa de miradores en el cliente.
   * El orden de los filtros está optimizado para reducir el conjunto lo antes posible.
   */
  async aplicarFiltros() {
    this.cargando.set(true);
    this.error.set(null);
    this.paginaActual.set(1); // resetea la paginación al aplicar nuevos filtros

    const texto       = this.q.trim();
    const tagIds      = this.selectedTagIds();
    const valoracionMin = this.valoracionMinima();
    const radioKm    = this.radioKm;

    try {
      // carga todos los miradores con datos completos para filtrar en cliente
      let base = await firstValueFrom(this.miradorService.cargarMiradores())
        .then(d => (d ?? []).filter(m => m?.id != null));

      // 1. filtro por radio de distancia: requiere geolocalización del usuario
      if (radioKm > 0) {
        const pos = await this.geoService.getPosition();
        base = base.filter(m => {
          const distancia = this.geoService.getDistanceTo(m.latitud, m.longitud);
          return distancia !== null && distancia <= radioKm;
        });
      }

      // 2. filtro por valoración mínima: excluye miradores sin valoraciones
      if (valoracionMin > 0) {
        base = base.filter(m => {
          if (!m.valoraciones_avg_puntuacion || m.valoraciones_avg_puntuacion === null) {
            return false;
          }
          return m.valoraciones_avg_puntuacion >= valoracionMin;
        });
      }

      // 3. filtro por tags: el mirador debe tener TODOS los tags seleccionados (AND)
      if (tagIds.length > 0) {
        base = base.filter(m =>
          tagIds.every(tagId => (m.tags?.some(t => t.id === tagId) ?? false))
        );
      }

      // 4. filtro por provincia
      if (this.provinciaId !== '') {
        base = base.filter(m => m.provincia_id === this.provinciaId);
      }

      // 5. filtro por dificultad: usa la ruta de menor distancia como ruta principal
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
          rutaPrincipal = rutaPrincipal || m.rutas[0]; // fallback a la primera ruta si ninguna tiene distancia
          return rutaPrincipal?.dificultad === this.dificultad;
        });
      }

      // 6. filtro por texto: busca en nombre y descripción
      if (texto.length > 0) {
        const textoBusqueda = texto.toLowerCase();
        base = base.filter(m =>
          m.nombre.toLowerCase().includes(textoBusqueda) ||
          m.descripcion.toLowerCase().includes(textoBusqueda)
        );
      }

      // 7. ordenamiento del resultado final
      let resultado = [...base];

      if (this.orden() === 'valoracion') {
        resultado.sort((a, b) => {
          const avgA = a.valoraciones_avg_puntuacion ?? 0;
          const avgB = b.valoraciones_avg_puntuacion ?? 0;
          return avgB - avgA; // mayor valoración primero
        });
      } else if (this.orden() === 'dificultad') {
        const dificultadOrder = { 'facil': 1, 'media': 2, 'dificil': 3 }; // orden de menor a mayor dificultad
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
        // requiere que la posición del usuario esté disponible
        const pos = await this.geoService.getPosition();
        resultado.sort((a, b) => {
          const distA = this.geoService.getDistanceTo(a.latitud, a.longitud) ?? Infinity; // Infinity para miradores sin distancia calculable
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
    this.filtrosVisibles.set(false); // cierra el panel de filtros tras aplicarlos
  }

  /**
   * Devuelve la dificultad de la ruta principal de un mirador
   * (la de menor distancia, o la primera si ninguna tiene distancia definida).
   */
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

  /**
   * Recalcula las distancias cuando el usuario actualiza su posición.
   */
  onPosicionActualizada(pos: UserPosition) {
    this.recalcularDistancias(this.miradores());
  }

  /**
   * Calcula la distancia desde la posición del usuario a cada mirador
   * y la almacena en un mapa indexado por ID de mirador.
   */
  private recalcularDistancias(lista: Mirador[]) {
    const map: Record<number, number> = {};
    for (const m of lista) {
      const d = this.geoService.getDistanceTo(m.latitud, m.longitud);
      if (d !== null) map[m.id] = d;
    }
    this.distancias.set(map);
  }

  /**
   * Devuelve la distancia en km al mirador indicado, o undefined si no está calculada.
   */
  getDistancia(id: number): number | undefined {
    return this.distancias()[id];
  }

  /**
   * Filtra los miradores por el texto de búsqueda introducido en el input.
   * Se aplica en tiempo real sobre la lista ya cargada sin nueva petición al servidor.
   */
  get miradoresFiltradosPorTexto(): Mirador[] {
    const texto = this.q.trim().toLowerCase();
    if (!texto) return this.miradores();
    return this.miradores().filter(m =>
      m.nombre.toLowerCase().includes(texto) ||
      m.descripcion?.toLowerCase().includes(texto)
    );
  }

  /**
   * Devuelve la porción de miradores correspondiente a la página actual.
   */
  get miradoresPaginados() {
    const lista  = this.miradoresFiltradosPorTexto;
    const inicio = (this.paginaActual() - 1) * this.POR_PAGINA;
    return lista.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginas() {
    return Math.ceil(this.miradoresFiltradosPorTexto.length / this.POR_PAGINA);
  }

  /** Devuelve un array con todos los números de página para iterar en el template. */
  get paginas() {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  /**
   * Devuelve las páginas visibles en el paginador con '...' para rangos omitidos.
   * Muestra siempre la primera, la última y las páginas adyacentes a la actual.
   */
  get paginasVisibles(): (number | '...')[] {
    const total  = this.totalPaginas;
    const actual = this.paginaActual();
    if (total <= 7) return this.paginas; // muestra todas si hay 7 o menos páginas

    const rango: (number | '...')[] = [];
    rango.push(1);

    if (actual > 3) rango.push('...'); // elipsis al inicio si la página actual está lejos del principio

    const inicio = Math.max(2, actual - 1);
    const fin    = Math.min(total - 1, actual + 1);
    for (let i = inicio; i <= fin; i++) rango.push(i);

    if (actual < total - 2) rango.push('...'); // elipsis al final si la página actual está lejos del final
    rango.push(total);

    return rango;
  }

  /**
   * Navega a la página indicada y hace scroll al inicio de la página.
   */
  irAPagina(p: number) {
    this.paginaActual.set(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Devuelve el número del primer resultado visible en la página actual. */
  get resultadoInicial(): number {
    return this.miradoresFiltradosPorTexto.length > 0 ? (this.paginaActual() - 1) * this.POR_PAGINA + 1 : 0;
  }

  /** Devuelve el número del último resultado visible en la página actual. */
  get resultadoFinal(): number {
    const fin = this.paginaActual() * this.POR_PAGINA;
    return fin > this.miradoresFiltradosPorTexto.length ? this.miradoresFiltradosPorTexto.length : fin;
  }
}
