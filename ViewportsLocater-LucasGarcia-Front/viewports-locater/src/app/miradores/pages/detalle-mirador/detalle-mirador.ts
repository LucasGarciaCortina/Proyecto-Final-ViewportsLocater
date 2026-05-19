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

  Math = Math;
  estaLogueado = this.authService.isLoggedIn;

  esFavorito = computed(() => {
    const id = this.detalle()?.mirador?.id;
    return id ? this.miradorService.favoritosIds().has(id) : false;
  });
  cargandoFavorito = signal(false);

  detalle = signal<MiradorDetalle | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  fotoActual = signal(0);

  editandoValoracionId = signal<number | null>(null);
  editandoValoracion = signal<{ puntuacion: number; comentario: string } | null>(null);

  valoraciones = signal<Valoracion[]>([]);
  mostrarFormularioValoracion = signal(false);
  cargandoValoracion = signal(false);
  errorValoracion = signal<string | null>(null);
  starsSeleccionadas = signal(0);
  starsHover = signal(0);

  nuevaValoracion = {
    puntuacion: 0,
    comentario: '',
  };

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

  climaSignal = computed(() => this.detalle()?.mirador?.clima ?? null);

  get clima(): Clima | null {
    return this.detalle()?.mirador?.clima ?? null;
  }

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

  get promedioValoracion(): number | null {
    const vals = this.valoraciones();
    if (!vals.length) return null;
    const sum = vals.reduce((acc, v) => acc + v.puntuacion, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }

  formatDuracion(min: number | null): string {
    if (min == null) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }

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
          this.miradorService.getRutasPorMirador(id).subscribe(rutas => {
            this.detalle.update(d => ({
              ...d!,
              rutas: rutas
            }));
          });
          // Cargar Mapa
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

  cargarValoraciones(miradorId: number): void {
    this.miradorService.getValoraciones(miradorId).subscribe({
      next: (data) => this.valoraciones.set(data ?? []),
      error: () => this.valoraciones.set([]),
    });
  }

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
        this.cargarValoraciones(id);

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
      }).catch(() => { });
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => { });
    }
  }

  descargarGpx(rutaId: number, nombre: string): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.miradorService.descargarGpx(rutaId).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${nombre}.gpx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      },
      error: () => console.error('Error al descargar el GPX')
    });
  }

  private inicializarMapa(lat: number, lng: number, nombre: string): void {
    setTimeout(() => {
      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      this.map = L.map('mapa-mirador').setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Fix icono por defecto de Leaflet en Angular
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

  // Verificar si el usuario actual es el propietario del mirador
  esPropietario(): boolean {
    const usuarioActual = this.authService.user();
    const detalleMirador = this.detalle();

    if (!usuarioActual || !detalleMirador) return false;
    return usuarioActual.id === detalleMirador.mirador.user_id ||
      this.authService.isAdmin();
  }

  // Ir a editar mirador
  editarMirador(): void {
    const miradorId = this.detalle()?.mirador.id;
    if (miradorId) {
      this.router.navigate(['/crear-mirador', miradorId]);
    }
  }
  // Eliminar mirador
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

  // Editar ruta individual
  editarRuta(rutaId: number): void {
    this.router.navigate(['/miradores', this.detalle()?.mirador.id, 'crear-ruta', rutaId]);
  }

  //  Eliminar ruta individual
  eliminarRuta(rutaId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ruta?')) {
      return;
    }

    this.miradorService.deleteRuta(rutaId).subscribe({
      next: () => {
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


  // Verificar si el usuario es propietario de una ruta
  esPropietarioRuta(ruta: any): boolean {
    const usuarioActual = this.authService.user();
    if (!usuarioActual) return false;
    return usuarioActual.id === ruta.user_id || this.authService.isAdmin();
  }


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
        // ACTUALIZAR DIRECTAMENTE EN LA SEÑAL
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

  eliminarValoracion(valoracionId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta valoración?')) return;

    this.cargandoValoracion.set(true);
    this.miradorService.deleteValoracion(valoracionId).subscribe({
      next: () => {
        this.cargandoValoracion.set(false);
        // ELIMINAR DIRECTAMENTE DE LA SEÑAL
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

  esValoracionTuya(valoracion: any): boolean {
    const usuarioActual = this.authService.user();
    if (!usuarioActual) return false;
    return usuarioActual.id === valoracion.user_id || this.authService.isAdmin();
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }

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
