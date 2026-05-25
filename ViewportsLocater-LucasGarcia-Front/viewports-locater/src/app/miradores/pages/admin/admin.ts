import { Component, OnInit, AfterViewInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { TagManagement } from '../../components/tag-management/tag-management';

/** Interfaz con los datos de estadísticas globales del panel de administración */
interface Estadisticas {
  total_miradores: number;
  total_usuarios: number;
  total_rutas: number;
  total_valoraciones: number;
  total_fotos: number;
  miradores_por_mes: { mes: number; total: number }[];
}

/** Interfaz con los datos de usuario necesarios para el panel de administración */
interface Usuario {
  id: number;
  name: string;
  email: string;
  created_at: string;
  roles: { name: string }[];
}

/** Interfaz con los datos de mirador necesarios para el panel de administración */
interface Mirador {
  id: number;
  nombre: string;
  descripcion: string;
  created_at: string;
  provincia: { nombre: string };
  user: { name: string } | null;
  valoraciones_avg_puntuacion: number | null;
}

/** Interfaz con los datos de ruta necesarios para el panel de administración */
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

// registra todos los componentes de Chart.js necesarios para los gráficos
Chart.register(...registerables);

/**
 * Componente del panel de administración.
 * Gestiona las secciones de estadísticas, usuarios, miradores, rutas y tags.
 * Incluye filtrado por texto, paginación y operaciones CRUD sobre cada entidad.
 */
@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterLink, FormsModule, TagManagement],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;
  private auth = inject(AuthService);

  // signals de datos cargados desde el servidor
  estadisticas = signal<Estadisticas | null>(null);
  usuarios     = signal<Usuario[]>([]);
  miradores    = signal<Mirador[]>([]);
  rutas        = signal<Ruta[]>([]);
  cargando     = signal(true);

  // sección activa del panel de administración
  seccion = signal<'estadisticas' | 'usuarios' | 'miradores' | 'rutas' | 'tags'>('estadisticas');

  // textos de búsqueda para filtrar cada listado
  searchUsuarios  = '';
  searchMiradores = '';
  searchRutas     = '';

  readonly POR_PAGINA = 10; // número de registros por página en todos los listados

  // páginas actuales de cada sección (no se usan signals porque no necesitan reactividad en el template)
  paginaUsuarios  = 1;
  paginaMiradores = 1;
  paginaRutas     = 1;

  readonly ADMIN_SYSTEM_ID = 4; // ID del administrador del sistema, protegido de modificaciones

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarUsuarios();
    this.cargarMiradores();
    this.cargarRutas();
  }

  /**
   * Crea el gráfico de miradores tras la inicialización de la vista.
   * El setTimeout garantiza que los datos ya estén cargados antes de renderizarlo.
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.crearGraficoMiradores();
    }, 500);
  }

  /**
   * Carga las estadísticas globales de la plataforma.
   */
  cargarEstadisticas(): void {
    this.http.get<Estadisticas>(`${this.api}/admin/estadisticas`).subscribe({
      next: (data) => {
        this.estadisticas.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /**
   * Carga la lista completa de usuarios con sus roles.
   */
  cargarUsuarios(): void {
    this.http.get<Usuario[]>(`${this.api}/admin/usuarios`).subscribe({
      next: (data) => this.usuarios.set(data ?? []),
    });
  }

  /**
   * Carga los miradores y calcula la valoración media en el cliente
   * a partir del array de valoraciones devuelto por el servidor.
   */
  cargarMiradores(): void {
    this.http.get<any[]>(`${this.api}/admin/miradores`).subscribe({
      next: (data) => {
        // calcula el promedio de valoraciones en el cliente porque el endpoint de admin
        // devuelve el array completo de valoraciones en lugar de la media calculada
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

  /**
   * Carga la lista completa de rutas con su mirador y usuario asociados.
   */
  cargarRutas(): void {
    this.http.get<Ruta[]>(`${this.api}/admin/rutas`).subscribe({
      next: (data) => this.rutas.set(data ?? []),
    });
  }

  /**
   * Crea el gráfico de barras de miradores creados por mes usando Chart.js.
   * Convierte el número de mes a nombre abreviado para las etiquetas del eje X.
   */
  private crearGraficoMiradores(): void {
    if (!this.estadisticas()?.miradores_por_mes) return;

    const datos = this.estadisticas()!.miradores_por_mes;
    const ctx   = document.getElementById('graficoMiradores') as HTMLCanvasElement;
    if (!ctx) return;

    const meses  = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = datos.map(d => meses[d.mes - 1]); // convierte número de mes (1-12) a nombre abreviado

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
          y: { beginAtZero: true, ticks: { stepSize: 1 } } // eje Y con valores enteros
        }
      }
    });
  }

  /**
   * Comprueba si el admin actual puede cambiar el rol de un usuario.
   * No se puede cambiar el rol del admin del sistema ni el propio.
   */
  puedeCambiarRol(usuario: Usuario): boolean {
    const usuarioActual = this.auth.user();

    if (usuario.id === this.ADMIN_SYSTEM_ID) {
      return false; // protege al administrador del sistema
    }

    if (usuarioActual && usuario.id === usuarioActual.id) {
      return false; // un admin no puede cambiar su propio rol
    }

    return true;
  }

  /**
   * Comprueba si el admin actual puede eliminar un usuario.
   * No se puede eliminar al admin del sistema ni a uno mismo.
   */
  puedeBorrarUsuario(usuario: Usuario): boolean {
    const usuarioActual = this.auth.user();

    if (usuario.id === this.ADMIN_SYSTEM_ID) {
      return false; // protege al administrador del sistema
    }

    if (usuarioActual && usuario.id === usuarioActual.id) {
      return false; // un admin no puede eliminarse a sí mismo
    }

    return true;
  }

  /**
   * Elimina un usuario tras confirmación. Muestra un mensaje diferente si es administrador.
   * Actualiza la lista local sin recargar desde el servidor.
   */
  eliminarUsuario(id: number): void {
    const usuario = this.usuarios().find(u => u.id === id);
    if (!usuario) return;

    if (!this.puedeBorrarUsuario(usuario)) {
      alert('No puedes eliminar este usuario');
      return;
    }

    // mensaje de confirmación más explícito si el usuario a eliminar es administrador
    const esAdmin  = this.getRol(usuario) === 'admin';
    const mensaje  = esAdmin
      ? `"${usuario.name}" es administrador. ¿Seguro que quieres eliminarlo?`
      : `¿Seguro que quieres eliminar a "${usuario.name}"?`;

    if (!confirm(mensaje)) return;

    this.http.delete(`${this.api}/admin/usuarios/${id}`).subscribe({
      next: () => this.usuarios.update(u => u.filter(x => x.id !== id)), // elimina el usuario de la lista local
      error: (err) => alert(err.error?.message || 'Error al eliminar usuario'),
    });
  }

  /**
   * Elimina un mirador tras confirmación del usuario.
   */
  eliminarMirador(id: number): void {
    if (!confirm('¿Seguro que quieres eliminar este mirador?')) return;
    this.http.delete(`${this.api}/admin/miradores/${id}`).subscribe({
      next: () => this.miradores.update(m => m.filter(x => x.id !== id)),
    });
  }

  /**
   * Elimina una ruta tras confirmación del usuario.
   */
  eliminarRuta(id: number): void {
    if (!confirm('¿Seguro que quieres eliminar esta ruta?')) return;
    this.http.delete(`${this.api}/admin/rutas/${id}`).subscribe({
      next: () => this.rutas.update(r => r.filter(x => x.id !== id)),
    });
  }

  /**
   * Cambia el rol de un usuario y actualiza la lista local.
   * Si el admin se cambia su propio rol, recarga la página para sincronizar el estado de sesión.
   */
  cambiarRol(usuario: Usuario, rol: string): void {
    if (!this.puedeCambiarRol(usuario)) {
      alert('No puedes cambiar el rol de este usuario');
      return;
    }

    this.http.put(`${this.api}/admin/usuarios/${usuario.id}/rol`, { role: rol }).subscribe({
      next: () => {
        // actualiza el rol del usuario en la lista local sin recargar todos los usuarios
        this.usuarios.update(lista =>
          lista.map(u => u.id === usuario.id ? { ...u, roles: [{ name: rol }] } : u)
        );

        // si el admin cambió su propio rol, limpia la sesión local y recarga para evitar estado inconsistente
        const usuarioActual = this.auth.user();
        if (usuarioActual && usuario.id === usuarioActual.id) {
          localStorage.removeItem('auth_user');
          setTimeout(() => {
            window.location.reload();
          }, 500); // pequeño delay para que la petición se complete antes de recargar
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Error al cambiar rol');
      },
    });
  }

  /**
   * Devuelve el ID del usuario actualmente autenticado.
   */
  getUsuarioActualId(): number | null {
    return this.auth.user()?.id ?? null;
  }

  /**
   * Devuelve el nombre del rol principal de un usuario, o 'user' si no tiene roles asignados.
   */
  getRol(usuario: Usuario): string {
    return usuario.roles?.[0]?.name ?? 'user';
  }

  /**
   * Cambia la sección activa del panel de administración.
   */
  cambiarSeccion(s: 'estadisticas' | 'usuarios' | 'miradores' | 'rutas' | 'tags'): void {
    this.seccion.set(s);
  }

  /** Filtra usuarios por nombre o email según el texto de búsqueda. */
  get usuariosFiltrados(): Usuario[] {
    const q = this.searchUsuarios.toLowerCase();
    return this.usuarios().filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  /** Devuelve la página actual de usuarios filtrados. */
  get usuariosPaginados(): Usuario[] {
    const inicio = (this.paginaUsuarios - 1) * this.POR_PAGINA;
    return this.usuariosFiltrados.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginasUsuarios(): number {
    return Math.ceil(this.usuariosFiltrados.length / this.POR_PAGINA);
  }

  /** Filtra miradores por nombre o provincia según el texto de búsqueda. */
  get miradoreFiltrados(): Mirador[] {
    const q = this.searchMiradores.toLowerCase();
    return this.miradores().filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.provincia.nombre.toLowerCase().includes(q)
    );
  }

  /** Devuelve la página actual de miradores filtrados. */
  get miradoresPaginados(): Mirador[] {
    const inicio = (this.paginaMiradores - 1) * this.POR_PAGINA;
    return this.miradoreFiltrados.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginasMiradores(): number {
    return Math.ceil(this.miradoreFiltrados.length / this.POR_PAGINA);
  }

  /** Filtra rutas por nombre, mirador o dificultad según el texto de búsqueda. */
  get rutasFiltradas(): Ruta[] {
    const q = this.searchRutas.toLowerCase();
    return this.rutas().filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      r.mirador.nombre.toLowerCase().includes(q) ||
      (r.dificultad || '').toLowerCase().includes(q)
    );
  }

  /** Devuelve la página actual de rutas filtradas. */
  get rutasPaginadas(): Ruta[] {
    const inicio = (this.paginaRutas - 1) * this.POR_PAGINA;
    return this.rutasFiltradas.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginasRutas(): number {
    return Math.ceil(this.rutasFiltradas.length / this.POR_PAGINA);
  }

  cambiarPaginaUsuarios(p: number): void  { this.paginaUsuarios = p;  }
  cambiarPaginaMiradores(p: number): void { this.paginaMiradores = p; }
  cambiarPaginaRutas(p: number): void     { this.paginaRutas = p;     }
}
