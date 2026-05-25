import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MiradorService } from '../../../services/mirador-service';
import * as L from 'leaflet';
import 'leaflet-gpx';
import { Chart } from 'chart.js/auto';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Componente de detalle de ruta de senderismo.
 * Muestra la información completa de una ruta, renderiza el trazado GPX
 * en un mapa Leaflet interactivo con capas intercambiables, y permite
 * descargar el GPX, compartir la ruta y gestionar su edición o eliminación.
 */
@Component({
  selector: 'app-detalle-ruta',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './detalle-ruta.html',
  styleUrls: ['./detalle-ruta.css']
})
export class DetalleRutaComponent implements OnInit, OnDestroy {
  ruta: any        = null;
  map: L.Map | null = null;
  elevationChart: Chart | null = null; // gráfico de elevación (reservado para uso futuro)
  loading          = true;
  cargando         = signal(false);
  error            = signal<string | null>(null);
  Math             = Math; // expuesto al template para usar Math.floor en el HTML

  mapaRuta: L.Map | null = null;
  // coordenadas del inicio y fin de la ruta extraídas del GPX
  puntoInicio: { lat: number; lng: number } | null = null;
  puntoFinal:  { lat: number; lng: number } | null = null;

  private route          = inject(ActivatedRoute);
  private miradorService = inject(MiradorService);
  private cdr            = inject(ChangeDetectorRef);
  private authService    = inject(AuthService);
  private router         = inject(Router);
  private location       = inject(Location);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const rutaId = params['rutaId'];
      this.loadRutaData(rutaId);
    });
  }

  /**
   * Carga los datos de la ruta desde el servidor.
   * Tras cargar, detecta cambios manualmente y espera 300ms antes de renderizar el GPX
   * para garantizar que el DOM del mapa esté listo.
   */
  private loadRutaData(rutaId: number) {
    this.loading = true;

    this.miradorService.getRutaById(rutaId).subscribe({
      next: (data) => {
        this.ruta    = data.ruta;
        this.loading = false;
        this.cdr.detectChanges(); // fuerza la detección de cambios porque estamos fuera del ciclo de Angular
        setTimeout(() => this.cargarGpx(), 300); // espera a que el DOM renderice el contenedor del mapa
      },
      error: (error) => {
        console.error('Error loading route:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Devuelve el emoji correspondiente a la condición meteorológica de OpenWeatherMap.
   */
  getWeatherIcon(condicion: string): string {
    switch (condicion) {
      case 'Clear':        return '☀️';
      case 'Clouds':       return '☁️';
      case 'Rain':         return '🌧️';
      case 'Thunderstorm': return '⛈️';
      case 'Snow':         return '❄️';
      case 'Mist':
      case 'Fog':          return '🌫️';
      default:             return '🌤️';
    }
  }

  /**
   * Devuelve el color asociado a la dificultad de la ruta para mostrar en la UI.
   */
  getDificultadColor(): string {
    if (!this.ruta) return '#10b981';
    const dificultad = this.ruta.dificultad?.toLowerCase() || 'fácil';
    if (dificultad.includes('fácil'))    return '#10b981'; // verde
    if (dificultad.includes('moderada')) return '#f59e0b'; // amarillo
    if (dificultad.includes('difícil'))  return '#ef4444'; // rojo
    return '#10b981';
  }

  /**
   * Convierte la duración estimada en minutos a un objeto con horas y minutos separados.
   */
  getTiempoHoras(): { horas: number; minutos: number } {
    if (!this.ruta) return { horas: 0, minutos: 0 };
    const totalMinutos = this.ruta.duracion_estimada_min || 0;
    return {
      horas:   Math.floor(totalMinutos / 60),
      minutos: totalMinutos % 60
    };
  }

  /**
   * Descarga el fichero GPX de la ruta creando un enlace temporal en el DOM.
   * Redirige al login si el usuario no está autenticado.
   */
  downloadGPX(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.ruta?.gpx_url) return;

    this.miradorService.descargarGpx(this.ruta.id).subscribe({
      next: (blob) => {
        // crea un enlace temporal para forzar la descarga del blob como fichero
        const link    = document.createElement('a');
        link.href     = URL.createObjectURL(blob);
        link.download = `${this.ruta.nombre}.gpx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // libera la memoria del objeto URL temporal
      },
      error: () => console.error('Error al descargar el GPX')
    });
  }

  /**
   * Comparte la ruta usando la Web Share API si está disponible,
   * o copia la URL al portapapeles como alternativa.
   */
  shareRoute() {
    if (navigator.share) {
      navigator.share({
        title: this.ruta?.nombre,
        text:  `Mira esta ruta: ${this.ruta?.nombre}`,
        url:   window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  /**
   * Destruye las instancias de Leaflet y Chart.js al abandonar el componente
   * para liberar memoria y evitar errores de "container already initialized".
   */
  ngOnDestroy() {
    if (this.map)           this.map.remove();
    if (this.mapaRuta)      this.mapaRuta.remove();
    if (this.elevationChart) this.elevationChart.destroy();
  }

  /**
   * Comprueba si el usuario actual es el propietario de la ruta o un administrador.
   */
  esPropietario(): boolean {
    const usuarioActual = this.authService.user();
    const ruta          = this.ruta;
    if (!usuarioActual || !ruta) return false;
    return usuarioActual.id === ruta.user_id || this.authService.isAdmin();
  }

  /**
   * Navega al formulario de edición de la ruta actual.
   */
  editarRuta(): void {
    const ruta = this.ruta;
    if (ruta) {
      this.router.navigate(['/miradores', ruta.mirador_id, 'crear-ruta', ruta.id]);
    }
  }

  /**
   * Elimina la ruta tras confirmación del usuario y redirige al detalle del mirador.
   */
  eliminarRuta(): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ruta?')) return;
    const ruta = this.ruta;
    if (!ruta) return;

    this.cargando.set(true);
    this.miradorService.deleteRuta(ruta.id).subscribe({
      next: () => {
        this.cargando.set(false);
        alert('✓ Ruta eliminada correctamente');
        this.router.navigate(['/miradores', ruta.mirador_id]);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.error?.message || 'Error al eliminar la ruta');
      }
    });
  }

  /**
   * Navega al detalle del mirador al que pertenece la ruta,
   * o a la página anterior si no hay mirador_id disponible.
   */
  volver(): void {
    if (this.ruta?.mirador_id) {
      this.router.navigate(['/miradores', this.ruta.mirador_id]);
    } else {
      this.location.back();
    }
  }

  /**
   * Copia una coordenada GPS al portapapeles del usuario.
   */
  copiarCoordenada(valor: number): void {
    navigator.clipboard.writeText(valor.toString());
  }

  /**
   * Carga y renderiza el trazado GPX de la ruta en el mapa Leaflet.
   * Parsea el XML del GPX manualmente para extraer los puntos del track,
   * dibuja la polilínea y marca el inicio (verde) y el fin (rojo) de la ruta.
   */
  cargarGpx(): void {
    if (!this.ruta?.gpx_url) {
      return;
    }

    // construye la URL completa del GPX si es una ruta relativa
    const baseUrl = environment.storageUrl;
    const gpxUrl  = this.ruta.gpx_url.startsWith('http')
      ? this.ruta.gpx_url
      : baseUrl + this.ruta.gpx_url;

    setTimeout(() => {
      const container = document.getElementById('mapa-ruta');
      if (!container) {
        return;
      }

      // destruye el mapa anterior si existe para evitar el error "Map container already initialized"
      if (this.mapaRuta) {
        this.mapaRuta.remove();
      }

      // centra inicialmente en España; se reajusta al cargar el GPX
      this.mapaRuta = L.map('mapa-ruta').setView([40.4637, -3.7492], 10);

      // capas de mapas disponibles para el control de capas
      const layers = {
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19
        }),
        'Satélite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 18
        }),
        'Terreno': L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap',
          maxZoom: 17
        }),
        'CartoDB': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© CartoDB',
          maxZoom: 19
        })
      };

      layers['OpenStreetMap'].addTo(this.mapaRuta); // capa por defecto al cargar

      // añade el control de capas en la esquina superior derecha
      L.control.layers(layers, {}, { position: 'topright' }).addTo(this.mapaRuta);

      // descarga el fichero GPX y lo parsea manualmente como XML
      fetch(gpxUrl)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then(gpxData => {
          const gpx    = new DOMParser().parseFromString(gpxData, 'text/xml');
          const trkpts = gpx.querySelectorAll('trkpt'); // selecciona todos los puntos del track

          if (trkpts.length === 0) {
            return;
          }

          // extrae las coordenadas de cada punto del track
          const coordinates: [number, number][] = [];
          trkpts.forEach(pt => {
            const lat = parseFloat(pt.getAttribute('lat') || '0');
            const lng = parseFloat(pt.getAttribute('lon') || '0');
            if (lat && lng) coordinates.push([lat, lng]);
          });

          if (coordinates.length > 0) {
            // dibuja la polilínea del trazado de la ruta
            const polyline = L.polyline(coordinates, {
              color:   '#1D9E75',
              weight:  4,
              opacity: 0.8
            }).addTo(this.mapaRuta!);

            // marcador de inicio en verde
            L.circleMarker(coordinates[0], {
              radius:      8,
              fillColor:   '#10b981',
              color:       '#fff',
              weight:      2,
              opacity:     1,
              fillOpacity: 0.8
            })
              .addTo(this.mapaRuta!)
              .bindPopup('🟢 Inicio');

            // marcador de fin en rojo
            L.circleMarker(coordinates[coordinates.length - 1], {
              radius:      8,
              fillColor:   '#ef4444',
              color:       '#fff',
              weight:      2,
              opacity:     1,
              fillOpacity: 0.8
            })
              .addTo(this.mapaRuta!)
              .bindPopup('🔴 Fin');

            // ajusta el zoom para que toda la ruta sea visible
            this.mapaRuta!.fitBounds(polyline.getBounds());

            // guarda las coordenadas de inicio y fin para mostrarlas en el template
            this.puntoInicio = { lat: coordinates[0][0],                          lng: coordinates[0][1] };
            this.puntoFinal  = { lat: coordinates[coordinates.length - 1][0],     lng: coordinates[coordinates.length - 1][1] };
          }
        })
        .catch(err => {
          console.error('❌ Error loading GPX:', err);
          this.error.set('Error cargando GPX: ' + err.message);
        });
    }, 300); // segundo setTimeout para garantizar que el contenedor DOM está renderizado
  }
}
