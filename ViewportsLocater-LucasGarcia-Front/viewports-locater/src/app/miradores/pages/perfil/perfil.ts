import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MiradorService } from '../../../services/mirador-service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';

interface Estadisticas {
  miradores: number;
  rutas: number;
  valoraciones: number;
  fotos: number;
}

@Component({
  selector: 'app-perfil',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private http = inject(HttpClient);
  auth = inject(AuthService);
  private router = inject(Router);
  private miradorService = inject(MiradorService);

  searchRutas = signal('');
  searchMiradores = signal('');

  readonly POR_PAGINA = 6;
  paginaMiradores = signal(1);
  paginaRutas = signal(1);
  paginaValoraciones = signal(1);

  estadisticas = signal<Estadisticas | null>(null);
  miradores = signal<any[]>([]);
  rutas = signal<any[]>([]);
  valoraciones = signal<any[]>([]);
  cargando = signal(true);

  seccionActiva = signal<'miradores' | 'rutas' | 'valoraciones'>('miradores');

  ngOnInit(): void {
    this.cargarDatos();
  }

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

  cambiarSeccion(seccion: 'miradores' | 'rutas' | 'valoraciones'): void {
    this.seccionActiva.set(seccion);
    this.paginaMiradores.set(1);
    this.paginaRutas.set(1);
    this.paginaValoraciones.set(1);
  }

  generarEstrellas(puntuacion: number): string {
    const llenas = Math.round(puntuacion);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }
  editarMirador(miradorId: number): void {
    this.router.navigate(['/crear-mirador', miradorId]);
  }

  eliminarMirador(miradorId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar este mirador?')) return;

    this.miradorService.deleteMirador(miradorId).subscribe({
      next: () => {
        alert('✓ Mirador eliminado correctamente');
        this.cargarDatos();
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar el mirador');
      }
    });
  }

  editarRuta(miradorId: number, rutaId: number): void {
    this.router.navigate(['/miradores', miradorId, 'crear-ruta', rutaId]);
  }

  eliminarRuta(rutaId: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta ruta?')) return;

    this.miradorService.deleteRuta(rutaId).subscribe({
      next: () => {
        alert('✓ Ruta eliminada correctamente');
        this.cargarDatos();
      },
      error: (err) => {
        alert(err.error?.message || 'Error al eliminar la ruta');
      }
    });
  }

  rutasFiltradas = computed(() => {
    const q = this.searchRutas().toLowerCase();
    if (!q) return this.rutas();
    return this.rutas().filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.mirador?.nombre.toLowerCase().includes(q)
    );
  });

  miradoresFiltrados = computed(() => {
    const q = this.searchMiradores().toLowerCase();
    if (!q) return this.miradores();
    return this.miradores().filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.provincia?.nombre.toLowerCase().includes(q)
    );
  });

  miradoresPaginados = computed(() => {
    const inicio = (this.paginaMiradores() - 1) * this.POR_PAGINA;
    return this.miradoresFiltrados().slice(inicio, inicio + this.POR_PAGINA);
  });

  totalPaginasMiradores = computed(() =>
    Math.ceil(this.miradoresFiltrados().length / this.POR_PAGINA)
  );

  rutasPaginadas = computed(() => {
    const inicio = (this.paginaRutas() - 1) * this.POR_PAGINA;
    return this.rutasFiltradas().slice(inicio, inicio + this.POR_PAGINA);
  });

  totalPaginasRutas = computed(() =>
    Math.ceil(this.rutasFiltradas().length / this.POR_PAGINA)
  );

  valoracionesPaginadas = computed(() => {
    const inicio = (this.paginaValoraciones() - 1) * this.POR_PAGINA;
    return this.valoraciones().slice(inicio, inicio + this.POR_PAGINA);
  });

  totalPaginasValoraciones = computed(() =>
    Math.ceil(this.valoraciones().length / this.POR_PAGINA)
  );
}
