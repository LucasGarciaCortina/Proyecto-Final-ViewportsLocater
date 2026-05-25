import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MiradorService } from '../../../services/mirador-service';
import { MiradorDetalle } from '../../../models/mirador_detalle.interface';
import { Clima } from '../../../models/mirador.interface';
import { Ruta } from '../../../models/ruta.interface';
import { Foto } from '../../../models/foto.interface';
import { Tag } from '../../../models/tag.interface';
import { Valoracion } from '../../../models/valoracion.interface';
import * as L from 'leaflet';
import { AuthService } from '../../../core/services/auth.service';
import { Location } from '@angular/common';

/**
 * Componente de detalle de mirador.
 * Muestra toda la información de un mirador: fotos, tags, rutas, clima,
 * mapa interactivo y valoraciones. Permite valorar, editar, eliminar
 * y gestionar favoritos si el usuario está autenticado.
 */
@Component({
  selector: 'app-detalle-mirador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './detalle-mirador.html',
  styleUrls: ['./detalle-mirador.css']
})
export class DetalleMirador implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private miradorService = inject(MiradorService);
  private map: L.Map | null = null;
  private location = inject(Location);

  Math = Math; // expuesto al template para usar Math.min/round en el HTML

  estaLogueado = this.authService.isLoggedIn;

  // computed que se recalcula automáticamente cuando cambia favoritosIds o el detalle
  esFavorito = computed(() => {
    const id = this.detalle()?.mirador?.id;
    return id ? this.miradorService.favoritosIds().has(id) : false;
  });
  cargandoFavorito = signal(false); // evita múltiples clicks mientras se procesa la petición

  // signals de estado del componente
  detalle = signal<MiradorDetalle | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  fotoActual = signal(0); // índice de la foto actualmente visible en el carrusel

  // signals para la edición inline de valoraciones
  editandoValoracionId = signal<number | null>(null);
  editandoValoracion = signal<{ puntuacion: number; comentario: string } | null>(null);

  // signals para el formulario de nueva valoración
  valoraciones = signal<Valoracion[]>([]);
  mostrarFormularioValoracion = signal(false);
  cargandoValoracion = signal(false);
  errorValoracion = signal<string | null>(null);
  starsSeleccionadas = signal(0);
  starsHover = signal(0); // estrella resaltada al pasar el cursor

  nuevaValoracion = {
    puntuacion: 0,
    comentario: '',
  };

  /** Devuelve las fotos del mirador o array vacío si no hay detalle cargado. */
  get fotos(): Foto[] {
    return this.detalle()?.fotos ?? [];
  }

  /** Devuelve las rutas del mirador o array vacío si no hay detalle cargado. */
  get rutas(): Ruta[] {
    return this.detalle()?.rutas ?? [];
  }

  /**
   * Devuelve la URL de la foto actualmente visible en el carrusel.
   * Usa Math.min para evitar índices fuera de rango si el array cambia.
   */
  get fotoPrincipalUrl(): string | null {
    const fotos = this.fotos;
    if (!fotos.length) return null;
    const idx = Math.min(this.fotoActual(), fotos.length - 1);
    return fotos[idx]?.url ?? null;
  }

  /**
   * Devuelve los tags del mirador como array de strings.
   * Soporta tanto arrays de strings como arrays de objetos con propiedad 'nombre'.
   */
  get tags(): string[] {
    const raw: Array<string | Tag> | undefined = (this.detalle()?.mirador as any)?.tags;
    if (!raw || !Array.isArray(raw)) return [];
    return raw
      .map((t) => (typeof t === 'string' ? t : t?.nombre))
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
  }

  /**
   * Devuelve la ruta de menor distancia como ruta principal.
   * Si ninguna tiene distancia, devuelve la primera del array.
   */
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

  // computed que expone el clima para uso reactivo en el template
  climaSignal = computed(() => this.detalle()?.mirador?.clima ?? null);

  get clima(): Clima | null {
    return this.detalle()?.mirador?.clima ?? null;
  }

  /**
   * Devuelve el emoji correspondiente a la condición meteorológica de OpenWeatherMap.
   */
  getWeatherIcon(condicion: string): string {
    switch (condicion) {
      case 'Clear': return '☀️';
      case 'Clouds': return '☁️';
      case 'Rain': return '🌧️';
      case 'Thunderstorm': return '⛈️';
      case 'Snow': return '❄️';
      case 'Mist':
      case 'Fog': return '🌫️';
      default: return '🌤️';
    }
  }

  /**
   * Calcula la valoración media de las valoraciones cargadas, redondeada a 1 decimal.
   * Devuelve null si no hay valoraciones.
   */
  get promedioValoracion(): number | null {
    const vals = this.valoraciones();
    if (!vals.length) return null;
    const sum = vals.reduce((acc, v) => acc + v.puntuacion, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }

  /**
   * Formatea una duración en minutos a formato legible (h y min).
   */
  formatDuracion(min: number | null): string {
    if (min == null) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }

  /**
   * Genera una cadena de estrellas llenas y vacías para representar una puntuación.
   */
  generarEstrellas(puntuacion: number): string {
    const llenas = Math.round(puntuacion);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = Number(params['id']);

      if (!id) {
        this.error.set('ID de mirador no válido');
        this.cargando.set(false);
        return;
      }

      this.cargando.set(true);
      this.error.set('');

      this.miradorService.getMiradorById(id).subscribe({
        next: (data) => {
          this.detalle.set(data);
          this.cargando.set(false);
          this.cargarValoraciones(id);

          // carga las rutas por separado para tener datos completos independientemente del endpoint de detalle
          this.miradorService.getRutasPorMirador(id).subscribe(rutas => {
            this.detalle.update(d => ({
              ...d!,
              rutas: rutas
            }));
          });

          // inicializa el mapa solo si el mirador tiene coordenadas válidas
          const m = data.mirador;
          if (m?.latitud && m?.longitud) {
            this.inicializarMapa(m.latitud, m.longitud, m.nombre);
          }
        },
        error: (err) => {
          console.error(err);
          this.error.set('No se pudo cargar el mirador.');
          this.cargando.set(false);
        },
      });
    });
  }

  /**
   * Carga las valoraciones del mirador desde el servidor.
   */
  cargarValoraciones(miradorId: number): void {
    this.miradorService.getValoraciones(miradorId).subscribe({
      next: (data) => this.valoraciones.set(data ?? []),
      error: () => this.valoraciones.set([]),
    });
  }

  /**
   * Abre el formulario de nueva valoración reseteando todos sus campos.
   */
  abrirFormularioValoracion(): void {
    this.nuevaValoracion = { puntuacion: 0, comentario: '' };
    this.starsSeleccionadas.set(0);
    this.starsHover.set(0);
    this.errorValoracion.set(null);
    this.mostrarFormularioValoracion.set(true);
  }

  cerrarFormularioValoracion(): void {
    this.errorValoracion.set(null);
    this.mostrarFormularioValoracion.set(false);
  }

  seleccionarEstrella(n: number): void {
    this.starsSeleccionadas.set(n);
    this.nuevaValoracion.puntuacion = n;
  }

  hoverEstrella(n: number): void {
    this.starsHover.set(n);
  }

  salirHoverEstrellas(): void {
    this.starsHover.set(0);
  }

  /**
   * Envía una nueva valoración al servidor.
   * Tras el éxito, recarga las valoraciones desde el servidor para mostrar datos actualizados.
   */
  enviarValoracion(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    const { puntuacion, comentario } = this.nuevaValoracion;
    if (puntuacion < 1 || puntuacion > 5) {
      this.errorValoracion.set('Por favor, selecciona una puntuación.');
      return;
    }

    this.errorValoracion.set(null);
    this.cargandoValoracion.set(true);
    this.miradorService.crearValoracion(id, {
      puntuacion,
      comentario: comentario.trim() || null,
    }).subscribe({
      next: () => {
        this.cargarValoraciones(id); // recarga desde el servidor para obtener el ID y fecha de la nueva valoración

        this.nuevaValoracion = { puntuacion: 0, comentario: '' };
        this.starsSeleccionadas.set(0);
        this.starsHover.set(0);

        this.cargandoValoracion.set(false);
        this.cerrarFormularioValoracion();
      },
      error: () => {
        this.errorValoracion.set('No se pudo enviar la valoración. Inténtalo de nuevo.');
        this.cargandoValoracion.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/home']);
  }

  /** Navega a la foto anterior en el carrusel de forma circular. */
  fotoAnterior(): void {
    const len = this.fotos.length;
    if (!len) return;
    this.fotoActual.update(i => (i - 1 + len) % len); // módulo para navegación circular
  }

  /** Navega a la foto siguiente en el carrusel de forma circular. */
  fotoSiguiente(): void {
    const len = this.fotos.length;
    if (!len) return;
    this.fotoActual.update(i => (i + 1) % len);
  }

  irAFoto(idx: number): void {
    this.fotoActual.set(idx);
  }

  /**
   * Comparte el mirador usando la Web Share API si está disponible,
   * o copia la URL al portapapeles como alternativa.
   */
  compartir(): void {
    if (navigator.share) {
      navigator.share({
        title: this.detalle()?.mirador?.nombre ?? 'Mirador',
        url: window.location.href,
      }).catch(() => { }); // el usuario puede cancelar el diálogo sin que sea un error
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => { });
    }
  }

  /**
   * Descarga el fichero GPX de una ruta creando un enlace temporal en el DOM.
   * Redirige al login si el usuario no está autenticado.
   */
  descargarGpx(rutaId: number, nombre: string): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.miradorService.descargarGpx(rutaId).subscribe({
      next: (blob) => {
        // crea un enlace temporal para forzar la descarga del blob como fichero
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${nombre}.gpx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // libera la memoria del objeto URL temporal
      },
      error: () => console.error('Error al descargar el GPX')
    });
  }

  /**
   * Inicializa el mapa Leaflet centrado en las coordenadas del mirador.
   * Destruye el mapa anterior si existía para evitar conflictos de instancias.
   */
  private inicializarMapa(lat: number, lng: number, nombre: string): void {
    setTimeout(() => {
      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      this.map = L.map('mapa-mirador').setView([lat, lng], 14);

      const layers = {
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }),
        'Satélite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 18,
        }),
        'Terreno': L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap',
          maxZoom: 17,
        }),
        'CartoDB': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          maxZoom: 19,
        }),
      };

      layers['OpenStreetMap'].addTo(this.map);
      L.control.layers(layers, {}, { position: 'topright' }).addTo(this.map);

      const iconDefault = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      L.marker([lat, lng], { icon: iconDefault })
        .addTo(this.map)
        .bindPopup(`<strong>${nombre}</strong>`)
        .openPopup();
    }, 100);
  }
  
  /**
   * Comprueba si el usuario actual es el propietario del mirador o un administrador.
   */
  esPropietario(): boolean {
    const usuarioActual = this.authService.user();
    const detalleMirador = this.detalle();

    if (!usuarioActual || !detalleMirador) return false;
    return usuarioActual.id === detalleMirador.mirador.user_id ||
      this.authService.isAdmin();
  }

  /**
   * Navega al formulario de edición del mirador actual.
   */
  editarMirador(): void {
    const miradorId = this.detalle()?.mirador.id;
    if (miradorId) {
      this.router.navigate(['/crear-mirador', miradorId]);
    }
  }

  /**
   * Elimina el mirador tras confirmación del usuario y redirige al inicio.
   */
  eliminarMirador(): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este mirador? Esta acción no se puede deshacer.')) {
      return;
    }

    const miradorId = this.detalle()?.mirador.id;
    if (!miradorId) return;

    this.cargando.set(true);
    this.miradorService.deleteMirador(miradorId).subscribe({
      next: () => {
        this.cargando.set(false);
        alert('Mirador eliminado correctamente');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.error?.message || 'Error al eliminar el mirador');
      }
    });
  }

  /**
   * Navega al formulario de edición de una ruta concreta.
   */
  editarRuta(rutaId: number): void {
    this.router.navigate(['/miradores', this.detalle()?.mirador.id, 'crear-ruta', rutaId]);
  }

  /**
   * Elimina una ruta tras confirmación y recarga la lista de rutas del mirador.
   */
  eliminarRuta(rutaId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ruta?')) {
      return;
    }

    this.miradorService.deleteRuta(rutaId).subscribe({
      next: () => {
        // recarga las rutas desde el servidor para reflejar el estado actualizado
        const miradorId = this.detalle()?.mirador.id;
        if (miradorId) {
          this.miradorService.getRutasPorMirador(miradorId).subscribe(rutas => {
            this.detalle.update(d => ({
              ...d!,
              rutas: rutas
            }));
          });
        }
        alert('Ruta eliminada correctamente');
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al eliminar la ruta');
      }
    });
  }

  /**
   * Comprueba si el usuario actual es el propietario de una ruta o un administrador.
   */
  esPropietarioRuta(ruta: any): boolean {
    const usuarioActual = this.authService.user();
    if (!usuarioActual) return false;
    return usuarioActual.id === ruta.user_id || this.authService.isAdmin();
  }

  /**
   * Guarda los cambios de una valoración editada inline.
   * Actualiza directamente el signal sin recargar todas las valoraciones.
   */
  guardarEdicionValoracion(valoracionId: number): void {
    const datos = this.editandoValoracion();
    if (!datos) return;

    this.cargandoValoracion.set(true);
    this.miradorService.updateValoracion(valoracionId, {
      puntuacion: datos.puntuacion,
      comentario: datos.comentario
    }).subscribe({
      next: () => {
        this.cargandoValoracion.set(false);
        // actualiza solo la valoración modificada en el signal sin recargar todas
        this.valoraciones.update(valoraciones =>
          valoraciones.map(v =>
            v.id === valoracionId
              ? { ...v, puntuacion: datos.puntuacion, comentario: datos.comentario }
              : v
          )
        );
        this.editandoValoracionId.set(null);
        this.editandoValoracion.set(null);
      },
      error: (err) => {
        this.cargandoValoracion.set(false);
        this.errorValoracion.set(err.error?.message || 'Error al actualizar valoración');
      }
    });
  }

  /**
   * Elimina una valoración tras confirmación.
   * Actualiza directamente el signal sin recargar todas las valoraciones.
   */
  eliminarValoracion(valoracionId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta valoración?')) return;

    this.cargandoValoracion.set(true);
    this.miradorService.deleteValoracion(valoracionId).subscribe({
      next: () => {
        this.cargandoValoracion.set(false);
        // elimina solo la valoración borrada del signal sin recargar todas
        this.valoraciones.update(valoraciones =>
          valoraciones.filter(v => v.id !== valoracionId)
        );
      },
      error: (err) => {
        this.cargandoValoracion.set(false);
        this.errorValoracion.set(err.error?.message || 'Error al eliminar valoración');
      }
    });
  }

  /**
   * Abre el modo de edición inline de una valoración precargando sus datos.
   */
  abrirEdicionValoracion(valoracion: any): void {
    this.editandoValoracionId.set(valoracion.id);
    this.editandoValoracion.set({
      puntuacion: valoracion.puntuacion,
      comentario: valoracion.comentario || ''
    });
  }

  cancelarEdicionValoracion(): void {
    this.editandoValoracionId.set(null);
    this.editandoValoracion.set(null);
  }

  /**
   * Comprueba si una valoración pertenece al usuario actual o si es administrador.
   */
  esValoracionTuya(valoracion: any): boolean {
    const usuarioActual = this.authService.user();
    if (!usuarioActual) return false;
    return usuarioActual.id === valoracion.user_id || this.authService.isAdmin();
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Añade o quita el mirador de favoritos según su estado actual.
   * Evita múltiples peticiones simultáneas con el signal cargandoFavorito.
   */
  toggleFavorito(): void {
    if (this.cargandoFavorito() || !this.detalle()) return;

    const miradorId = this.detalle()!.mirador.id;
    this.cargandoFavorito.set(true);

    if (this.esFavorito()) {
      this.miradorService.quitarFavorito(miradorId).subscribe({
        next: () => this.cargandoFavorito.set(false),
        error: () => this.cargandoFavorito.set(false),
      });
    } else {
      this.miradorService.agregarFavorito(miradorId).subscribe({
        next: () => this.cargandoFavorito.set(false),
        error: () => this.cargandoFavorito.set(false),
      });
    }
  }
}
