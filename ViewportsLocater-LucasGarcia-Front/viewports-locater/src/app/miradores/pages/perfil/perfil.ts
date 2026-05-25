import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MiradorService } from '../../../services/mirador-service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';

/** Interfaz con el resumen de actividad del usuario en la plataforma */
interface Estadisticas {
  miradores:    number;
  rutas:        number;
  valoraciones: number;
  fotos:        number;
}

/**
 * Componente de la página de perfil del usuario autenticado.
 * Muestra las estadísticas de actividad y los listados de miradores,
 * rutas y valoraciones creadas por el usuario, con filtrado y paginación.
 */
@Component({
  selector: 'app-perfil',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private http           = inject(HttpClient);
  auth                   = inject(AuthService);
  private router         = inject(Router);
  private miradorService = inject(MiradorService);

  // signals para los textos de búsqueda de cada sección
  searchRutas      = signal('');
  searchMiradores  = signal('');

  readonly POR_PAGINA = 6; // número de elementos por página en todos los listados

  // signals de paginación por sección
  paginaMiradores   = signal(1);
  paginaRutas       = signal(1);
  paginaValoraciones = signal(1);

  // signals de datos cargados desde el servidor
  estadisticas = signal<Estadisticas | null>(null);
  miradores    = signal<any[]>([]);
  rutas        = signal<any[]>([]);
  valoraciones = signal<any[]>([]);
  cargando     = signal(true);

  seccionActiva = signal<'miradores' | 'rutas' | 'valoraciones'>('miradores');

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Carga en paralelo las estadísticas, miradores, rutas y valoraciones del usuario.
   * Las rutas se ordenan por fecha de creación descendente antes de almacenarlas.
   */
  cargarDatos(): void {
    const api = environment.apiUrl;

    this.http.get<Estadisticas>(`${api}/perfil/estadisticas`).subscribe({
      next: (data) => this.estadisticas.set(data),
    });

    this.http.get<any[]>(`${api}/perfil/miradores`).subscribe({
      next: (data) => {
        this.miradores.set(data ?? []);
        this.cargando.set(false);
      },
    });

    this.http.get<any[]>(`${api}/perfil/rutas`).subscribe({
      next: (data) => {
        // ordena las rutas por fecha de creación descendente (más recientes primero)
        const rutasOrdenadas = (data ?? []).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.rutas.set(rutasOrdenadas);
      },
    });

    this.http.get<any[]>(`${api}/perfil/valoraciones`).subscribe({
      next: (data) => this.valoraciones.set(data ?? []),
    });
  }

  /**
   * Cambia la sección activa del perfil y resetea todas las páginas a 1
   * para evitar que el usuario quede en una página inexistente al cambiar de sección.
   */
  cambiarSeccion(seccion: 'miradores' | 'rutas' | 'valoraciones'): void {
    this.seccionActiva.set(seccion);
    this.paginaMiradores.set(1);
    this.paginaRutas.set(1);
    this.paginaValoraciones.set(1);
  }

  /**
   * Genera una cadena de estrellas llenas y vacías para representar una puntuación.
   */
  generarEstrellas(puntuacion: number): string {
    const llenas = Math.round(puntuacion);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }

  /**
   * Navega al formulario de edición del mirador indicado.
   */
  editarMirador(miradorId: number): void {
    this.router.navigate(['/crear-mirador', miradorId]);
  }

  /**
   * Elimina un mirador tras confirmación y recarga todos los datos del perfil.
   */
  eliminarMirador(miradorId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este mirador?')) return;

    this.miradorService.deleteMirador(miradorId).subscribe({
      next: () => {
        alert('✓ Mirador eliminado correctamente');
        this.cargarDatos(); // recarga todos los datos para reflejar el estado actualizado
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar el mirador');
      }
    });
  }

  /**
   * Navega al formulario de edición de una ruta concreta.
   */
  editarRuta(miradorId: number, rutaId: number): void {
    this.router.navigate(['/miradores', miradorId, 'crear-ruta', rutaId]);
  }

  /**
   * Elimina una ruta tras confirmación y recarga todos los datos del perfil.
   */
  eliminarRuta(rutaId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ruta?')) return;

    this.miradorService.deleteRuta(rutaId).subscribe({
      next: () => {
        alert('✓ Ruta eliminada correctamente');
        this.cargarDatos(); // recarga todos los datos para reflejar el estado actualizado
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar la ruta');
      }
    });
  }

  // computed reactivos: se recalculan automáticamente cuando cambia el texto de búsqueda o los datos

  /** Filtra las rutas por nombre o nombre del mirador según el texto de búsqueda. */
  rutasFiltradas = computed(() => {
    const q = this.searchRutas().toLowerCase();
    if (!q) return this.rutas();
    return this.rutas().filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.mirador?.nombre.toLowerCase().includes(q)
    );
  });

  /** Filtra los miradores por nombre o provincia según el texto de búsqueda. */
  miradoresFiltrados = computed(() => {
    const q = this.searchMiradores().toLowerCase();
    if (!q) return this.miradores();
    return this.miradores().filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.provincia?.nombre.toLowerCase().includes(q)
    );
  });

  /** Devuelve la página actual de miradores filtrados. */
  miradoresPaginados = computed(() => {
    const inicio = (this.paginaMiradores() - 1) * this.POR_PAGINA;
    return this.miradoresFiltrados().slice(inicio, inicio + this.POR_PAGINA);
  });

  totalPaginasMiradores = computed(() =>
    Math.ceil(this.miradoresFiltrados().length / this.POR_PAGINA)
  );

  /** Devuelve la página actual de rutas filtradas. */
  rutasPaginadas = computed(() => {
    const inicio = (this.paginaRutas() - 1) * this.POR_PAGINA;
    return this.rutasFiltradas().slice(inicio, inicio + this.POR_PAGINA);
  });

  totalPaginasRutas = computed(() =>
    Math.ceil(this.rutasFiltradas().length / this.POR_PAGINA)
  );

  /** Devuelve la página actual de valoraciones (sin filtro de texto). */
  valoracionesPaginadas = computed(() => {
    const inicio = (this.paginaValoraciones() - 1) * this.POR_PAGINA;
    return this.valoraciones().slice(inicio, inicio + this.POR_PAGINA);
  });

  totalPaginasValoraciones = computed(() =>
    Math.ceil(this.valoraciones().length / this.POR_PAGINA)
  );
}
