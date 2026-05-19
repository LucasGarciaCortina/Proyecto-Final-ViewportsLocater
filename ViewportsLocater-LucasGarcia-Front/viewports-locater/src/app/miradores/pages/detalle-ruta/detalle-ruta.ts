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


@Component({
  selector: 'app-detalle-ruta',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './detalle-ruta.html',
  styleUrls: ['./detalle-ruta.css']
})
export class DetalleRutaComponent implements OnInit, OnDestroy {
  ruta: any = null;
  map: L.Map | null = null;
  elevationChart: Chart | null = null;
  loading = true;
  cargando = signal(false);
  error = signal<string | null>(null);
  Math = Math;

  mapaRuta: L.Map | null = null;
  puntoInicio: { lat: number; lng: number } | null = null;
  puntoFinal: { lat: number; lng: number } | null = null;


  private route = inject(ActivatedRoute);
  private miradorService = inject(MiradorService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const rutaId = params['rutaId'];
      this.loadRutaData(rutaId);
    });
  }

  private loadRutaData(rutaId: number) {
    this.loading = true;

    this.miradorService.getRutaById(rutaId).subscribe({
      next: (data) => {
        this.ruta = data.ruta;
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.cargarGpx(), 300);
      },
      error: (error) => {
        console.error('Error loading route:', error);
        this.loading = false;
      }
    });
  }

  getWeatherIcon(condicion: string): string {
    switch (condicion) {
      case 'Clear': return '☀️';
      case 'Clouds': return '☁️';
      case 'Rain': return '🌧️';
      case 'Thunderstorm': return '⛈️';
      case 'Snow': return '❄️';
      case 'Mist': case 'Fog': return '🌫️';
      default: return '🌤️';
    }
  }

  getDificultadColor(): string {
    if (!this.ruta) return '#10b981';
    const dificultad = this.ruta.dificultad?.toLowerCase() || 'fácil';
    if (dificultad.includes('fácil')) return '#10b981';
    if (dificultad.includes('moderada')) return '#f59e0b';
    if (dificultad.includes('difícil')) return '#ef4444';
    return '#10b981';
  }

  getTiempoHoras(): { horas: number; minutos: number } {
    if (!this.ruta) return { horas: 0, minutos: 0 };
    const totalMinutos = this.ruta.duracion_estimada_min || 0;
    return {
      horas: Math.floor(totalMinutos / 60),
      minutos: totalMinutos % 60
    };
  }

  downloadGPX(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.ruta?.gpx_url) return;

    this.miradorService.descargarGpx(this.ruta.id).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${this.ruta.nombre}.gpx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      },
      error: () => console.error('Error al descargar el GPX')
    });
  }

  shareRoute() {
    if (navigator.share) {
      navigator.share({
        title: this.ruta?.nombre,
        text: `Mira esta ruta: ${this.ruta?.nombre}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.mapaRuta) {
      this.mapaRuta.remove();
    }
    if (this.elevationChart) {
      this.elevationChart.destroy();
    }
  }

  esPropietario(): boolean {
    const usuarioActual = this.authService.user();
    const ruta = this.ruta;
    if (!usuarioActual || !ruta) return false;
    return usuarioActual.id === ruta.user_id || this.authService.isAdmin();
  }

  editarRuta(): void {
    const ruta = this.ruta;
    if (ruta) {
      this.router.navigate(['/miradores', ruta.mirador_id, 'crear-ruta', ruta.id]);
    }
  }

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

  volver(): void {
    if (this.ruta?.mirador_id) {
      this.router.navigate(['/miradores', this.ruta.mirador_id]);
    } else {
      this.location.back();
    }
  }

  copiarCoordenada(valor: number): void {
    navigator.clipboard.writeText(valor.toString());
  }

  cargarGpx(): void {

    if (!this.ruta?.gpx_url) {
      return;
    }

    const baseUrl = environment.storageUrl;
    const gpxUrl = this.ruta.gpx_url.startsWith('http')
      ? this.ruta.gpx_url
      : baseUrl + this.ruta.gpx_url;

    setTimeout(() => {
      const container = document.getElementById('mapa-ruta');
      if (!container) {
        return;
      }

      if (this.mapaRuta) {
        this.mapaRuta.remove();
      }

      this.mapaRuta = L.map('mapa-ruta').setView([40.4637, -3.7492], 10);

      // Definir capas disponibles
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

      // Agregar OpenStreetMap por defecto
      layers['OpenStreetMap'].addTo(this.mapaRuta);

      // Agregar control de capas
      L.control.layers(layers, {}, { position: 'topright' }).addTo(this.mapaRuta);

      fetch(gpxUrl)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then(gpxData => {


          const gpx = new DOMParser().parseFromString(gpxData, 'text/xml');
          const trkpts = gpx.querySelectorAll('trkpt');

          if (trkpts.length === 0) {
            return;
          }

          const coordinates: [number, number][] = [];
          trkpts.forEach(pt => {
            const lat = parseFloat(pt.getAttribute('lat') || '0');
            const lng = parseFloat(pt.getAttribute('lon') || '0');
            if (lat && lng) coordinates.push([lat, lng]);
          });

          if (coordinates.length > 0) {
            const polyline = L.polyline(coordinates, {
              color: '#1D9E75',
              weight: 4,
              opacity: 0.8
            }).addTo(this.mapaRuta!);

            L.circleMarker(coordinates[0], {
              radius: 8,
              fillColor: '#10b981',
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            })
              .addTo(this.mapaRuta!)
              .bindPopup('🟢 Inicio');

            // Fin - Rojo
            L.circleMarker(coordinates[coordinates.length - 1], {
              radius: 8,
              fillColor: '#ef4444',
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            })
              .addTo(this.mapaRuta!)
              .bindPopup('🔴 Fin');

            this.mapaRuta!.fitBounds(polyline.getBounds());

            this.puntoInicio = {
              lat: coordinates[0][0],
              lng: coordinates[0][1]
            };
            this.puntoFinal = {
              lat: coordinates[coordinates.length - 1][0],
              lng: coordinates[coordinates.length - 1][1]
            };
          }
        })
        .catch(err => {
          console.error('❌ Error loading GPX:', err);
          this.error.set('Error cargando GPX: ' + err.message);
        });
    }, 300);
  }
}
