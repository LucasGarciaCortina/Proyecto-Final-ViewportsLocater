import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz que representa un tag del sistema.
 */
interface Tag {
  id: number;
  nombre: string;
}

/**
 * Componente de gestión de tags para el panel de administración.
 * Permite listar, crear, editar y eliminar tags.
 * Hace las peticiones HTTP directamente sin pasar por un servicio dedicado.
 */
@Component({
  selector: 'app-tag-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-management.html',
  styleUrl: './tag-management.css'
})
export class TagManagement implements OnInit {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  // signals de estado del listado
  tags     = signal<Tag[]>([]);
  cargando = signal(true);
  error    = signal<string | null>(null);

  // signals de estado del formulario de creación/edición
  mostrarFormulario  = signal(false);
  editandoId         = signal<number | null>(null); // null si se está creando, número si se está editando
  nombreTag          = signal('');
  cargandoGuardar    = signal(false);

  ngOnInit(): void {
    this.cargarTags();
  }

  /**
   * Carga la lista completa de tags desde el servidor.
   */
  cargarTags(): void {
    this.cargando.set(true);
    this.http.get<Tag[]>(`${this.api}/tags`).subscribe({
      next: (data) => {
        this.tags.set(data ?? []); // usa array vacío si la respuesta es null/undefined
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Error al cargar los tags');
        this.cargando.set(false);
      }
    });
  }

  /**
   * Abre el formulario en modo creación, reseteando los campos.
   */
  abrirFormularioNuevo(): void {
    this.editandoId.set(null);
    this.nombreTag.set('');
    this.error.set(null);
    this.mostrarFormulario.set(true);
  }

  /**
   * Abre el formulario en modo edición, precargando los datos del tag seleccionado.
   */
  abrirFormularioEditar(tag: Tag): void {
    this.editandoId.set(tag.id);
    this.nombreTag.set(tag.nombre);
    this.error.set(null);
    this.mostrarFormulario.set(true);
  }

  /**
   * Cierra el formulario y resetea todos sus campos y estados.
   */
  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.editandoId.set(null);
    this.nombreTag.set('');
    this.error.set(null);
  }

  /**
   * Guarda el tag actual, creándolo o actualizándolo según el estado del formulario.
   * Actualiza la lista local sin necesidad de recargar desde el servidor.
   */
  guardarTag(): void {
    const nombre = this.nombreTag().trim();

    if (!nombre) {
      this.error.set('El nombre del tag no puede estar vacío');
      return;
    }

    if (nombre.length > 50) {
      this.error.set('El nombre no puede exceder 50 caracteres');
      return;
    }

    this.cargandoGuardar.set(true);
    this.error.set(null);

    if (this.editandoId()) {
      // modo edición: actualiza el tag existente
      this.http.put<Tag>(`${this.api}/admin/tags/${this.editandoId()}`, { nombre }).subscribe({
        next: (tagActualizado: Tag) => {
          // reemplaza el tag editado en la lista local sin recargar todos los tags
          this.tags.update(lista =>
            lista.map(t => t.id === this.editandoId() ? tagActualizado : t)
          );
          this.cargandoGuardar.set(false);
          this.cerrarFormulario();
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Error al actualizar el tag');
          this.cargandoGuardar.set(false);
        }
      });
    } else {
      // modo creación: añade el nuevo tag y reordena alfabéticamente
      this.http.post<Tag>(`${this.api}/admin/tags`, { nombre }).subscribe({
        next: (tagNuevo: Tag) => {
          // añade el nuevo tag y reordena la lista alfabéticamente
          this.tags.update(lista => [...lista, tagNuevo].sort((a, b) =>
            a.nombre.localeCompare(b.nombre)
          ));
          this.cargandoGuardar.set(false);
          this.cerrarFormulario();
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Error al crear el tag');
          this.cargandoGuardar.set(false);
        }
      });
    }
  }

  /**
   * Elimina un tag tras confirmación del usuario.
   * Elimina el tag de la lista local sin recargar todos los tags.
   */
  eliminarTag(id: number, nombre: string): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar el tag "${nombre}"?`)) {
      return;
    }

    this.http.delete(`${this.api}/admin/tags/${id}`).subscribe({
      next: () => {
        this.tags.update(lista => lista.filter(t => t.id !== id)); // filtra el tag eliminado de la lista local
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al eliminar el tag');
      }
    });
  }
}
