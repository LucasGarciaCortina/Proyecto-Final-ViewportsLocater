import { Component, OnInit, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { TagManagement } from '../../components/tag-management/tag-management';

interface Estadisticas {
  total_miradores: number;
  total_usuarios: number;
  total_rutas: number;
  total_valoraciones: number;
  total_fotos: number;
  miradores_por_mes: { mes: number; total: number }[];
}

interface Usuario {
  id: number;
  name: string;
  email: string;
  created_at: string;
  roles: { name: string }[];
}

interface Mirador {
  id: number;
  nombre: string;
  descripcion: string;
  created_at: string;
  provincia: { nombre: string };
  user: { name: string } | null;
  valoraciones_avg_puntuacion: number | null;
}

interface Ruta {
  id: number;
  nombre: string;
  mirador_id: number;
  distancia_km: number | null;
  duracion_estimada_min: number | null;
  dificultad: string;
  mirador: { nombre: string };
  user?: { name: string } | null;
}

Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterLink, FormsModule, TagManagement],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  private auth = inject(AuthService);

  estadisticas = signal<Estadisticas | null>(null);
  usuarios = signal<Usuario[]>([]);
  miradores = signal<Mirador[]>([]);
  rutas = signal<Ruta[]>([]);
  cargando = signal(true);
  seccion = signal<'estadisticas' | 'usuarios' | 'miradores' | 'rutas' | 'tags'>('estadisticas');
  searchUsuarios = '';
  searchMiradores = '';
  searchRutas = '';

  readonly POR_PAGINA = 10;
  paginaUsuarios = 1;
  paginaMiradores = 1;
  paginaRutas = 1;

  readonly ADMIN_SYSTEM_ID = 4;

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarUsuarios();
    this.cargarMiradores();
    this.cargarRutas();
  }

  ngAfterViewInit(): void {
    // Esperar a que los datos se carguen antes de crear el gráfico
    setTimeout(() => {
      this.crearGraficoMiradores();
    }, 500);
  }

  cargarEstadisticas(): void {
    this.http.get<Estadisticas>(`${this.api}/admin/estadisticas`).subscribe({
      next: (data) => {
        this.estadisticas.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  cargarUsuarios(): void {
    this.http.get<Usuario[]>(`${this.api}/admin/usuarios`).subscribe({
      next: (data) => this.usuarios.set(data ?? []),
    });
  }

  cargarMiradores(): void {
    this.http.get<any[]>(`${this.api}/admin/miradores`).subscribe({
      next: (data) => {
        // Calcular el promedio de valoraciones client-side
        const miradoresConValoracion = data?.map(m => {
          let promedio = null;
          if (m.valoraciones && m.valoraciones.length > 0) {
            const suma = m.valoraciones.reduce((acc: number, v: any) => acc + (v.puntuacion || 0), 0);
            promedio = suma / m.valoraciones.length;
          }
          return {
            ...m,
            valoraciones_avg_puntuacion: promedio
          } as Mirador;
        }) ?? [];
        this.miradores.set(miradoresConValoracion);
      },
    });
  }

  cargarRutas(): void {
    this.http.get<Ruta[]>(`${this.api}/admin/rutas`).subscribe({
      next: (data) => this.rutas.set(data ?? []),
    });
  }

  private crearGraficoMiradores(): void {
    if (!this.estadisticas()?.miradores_por_mes) return;

    const datos = this.estadisticas()!.miradores_por_mes;
    const ctx = document.getElementById('graficoMiradores') as HTMLCanvasElement;
    if (!ctx) return;

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = datos.map(d => meses[d.mes - 1]);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Miradores creados',
          data: datos.map(d => d.total),
          backgroundColor: '#1D9E75',
          borderColor: '#0F6E56',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'top' }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  puedeCambiarRol(usuario: Usuario): boolean {
    const usuarioActual = this.auth.user();

    // No se puede cambiar el rol del Admin del sistema (ID = 1)
    if (usuario.id === this.ADMIN_SYSTEM_ID) {
      return false;
    }

    // No se puede cambiar el propio rol
    if (usuarioActual && usuario.id === usuarioActual.id) {
      return false;
    }

    return true;
  }

  puedeBorrarUsuario(usuario: Usuario): boolean {
    const usuarioActual = this.auth.user();

    // No se puede borrar el admin del sistema
    if (usuario.id === this.ADMIN_SYSTEM_ID) {
      return false;
    }

    // No se puede borrarse a sí mismo
    if (usuarioActual && usuario.id === usuarioActual.id) {
      return false;
    }

    return true;
  }

  eliminarUsuario(id: number): void {
    const usuario = this.usuarios().find(u => u.id === id);
    if (!usuario) return;

    if (!this.puedeBorrarUsuario(usuario)) {
      alert('No puedes eliminar este usuario');
      return;
    }

    const esAdmin = this.getRol(usuario) === 'admin';
    const mensaje = esAdmin
      ? `"${usuario.name}" es administrador. ¿Seguro que quieres eliminarlo?`
      : `¿Seguro que quieres eliminar a "${usuario.name}"?`;

    if (!confirm(mensaje)) return;

    this.http.delete(`${this.api}/admin/usuarios/${id}`).subscribe({
      next: () => this.usuarios.update(u => u.filter(x => x.id !== id)),
      error: (err) => alert(err.error?.message || 'Error al eliminar usuario'),
    });
  }

  eliminarMirador(id: number): void {
    if (!confirm('¿Seguro que quieres eliminar este mirador?')) return;
    this.http.delete(`${this.api}/admin/miradores/${id}`).subscribe({
      next: () => this.miradores.update(m => m.filter(x => x.id !== id)),
    });
  }

  eliminarRuta(id: number): void {
    if (!confirm('¿Seguro que quieres eliminar esta ruta?')) return;
    this.http.delete(`${this.api}/admin/rutas/${id}`).subscribe({
      next: () => this.rutas.update(r => r.filter(x => x.id !== id)),
    });
  }
  cambiarRol(usuario: Usuario, rol: string): void {
    // VERIFICAR PERMISOS
    if (!this.puedeCambiarRol(usuario)) {
      alert('No puedes cambiar el rol de este usuario');
      return;
    }

    this.http.put(`${this.api}/admin/usuarios/${usuario.id}/rol`, { role: rol }).subscribe({
      next: () => {
        this.usuarios.update(lista =>
          lista.map(u => u.id === usuario.id ? { ...u, roles: [{ name: rol }] } : u)
        );

        // Si cambias el rol del usuario actual
        const usuarioActual = this.auth.user();
        if (usuarioActual && usuario.id === usuarioActual.id) {
          localStorage.removeItem('auth_user');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Error al cambiar rol');
      },
    });
  }

  getUsuarioActualId(): number | null {
    return this.auth.user()?.id ?? null;
  }

  getRol(usuario: Usuario): string {
    return usuario.roles?.[0]?.name ?? 'user';
  }

  cambiarSeccion(s: 'estadisticas' | 'usuarios' | 'miradores' | 'rutas' | 'tags'): void {
    this.seccion.set(s);
  }

  get usuariosFiltrados(): Usuario[] {
    const q = this.searchUsuarios.toLowerCase();
    return this.usuarios().filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  get usuariosPaginados(): Usuario[] {
    const inicio = (this.paginaUsuarios - 1) * this.POR_PAGINA;
    return this.usuariosFiltrados.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginasUsuarios(): number {
    return Math.ceil(this.usuariosFiltrados.length / this.POR_PAGINA);
  }

  get miradoreFiltrados(): Mirador[] {
    const q = this.searchMiradores.toLowerCase();
    return this.miradores().filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.provincia.nombre.toLowerCase().includes(q)
    );
  }

  get miradoresPaginados(): Mirador[] {
    const inicio = (this.paginaMiradores - 1) * this.POR_PAGINA;
    return this.miradoreFiltrados.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginasMiradores(): number {
    return Math.ceil(this.miradoreFiltrados.length / this.POR_PAGINA);
  }

  get rutasFiltradas(): Ruta[] {
    const q = this.searchRutas.toLowerCase();
    return this.rutas().filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.mirador.nombre.toLowerCase().includes(q) ||
      (r.dificultad || '').toLowerCase().includes(q)
    );
  }

  get rutasPaginadas(): Ruta[] {
    const inicio = (this.paginaRutas - 1) * this.POR_PAGINA;
    return this.rutasFiltradas.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginasRutas(): number {
    return Math.ceil(this.rutasFiltradas.length / this.POR_PAGINA);
  }

  cambiarPaginaUsuarios(p: number): void { this.paginaUsuarios = p; }
  cambiarPaginaMiradores(p: number): void { this.paginaMiradores = p; }
  cambiarPaginaRutas(p: number): void { this.paginaRutas = p; }
}
