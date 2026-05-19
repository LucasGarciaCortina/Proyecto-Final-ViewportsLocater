import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Tag {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-tag-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-management.html',
  styleUrl: './tag-management.css'
})
export class TagManagement implements OnInit {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  tags = signal<Tag[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Formulario
  mostrarFormulario = signal(false);
  editandoId = signal<number | null>(null);
  nombreTag = signal('');
  cargandoGuardar = signal(false);

  ngOnInit(): void {
    this.cargarTags();
  }

  cargarTags(): void {
    this.cargando.set(true);
    this.http.get<Tag[]>(`${this.api}/tags`).subscribe({
      next: (data) => {
        this.tags.set(data ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Error al cargar los tags');
        this.cargando.set(false);
      }
    });
  }

  abrirFormularioNuevo(): void {
    this.editandoId.set(null);
    this.nombreTag.set('');
    this.error.set(null);
    this.mostrarFormulario.set(true);
  }

  abrirFormularioEditar(tag: Tag): void {
    this.editandoId.set(tag.id);
    this.nombreTag.set(tag.nombre);
    this.error.set(null);
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.editandoId.set(null);
    this.nombreTag.set('');
    this.error.set(null);
  }

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
      // ACTUALIZAR
      this.http.put<Tag>(`${this.api}/admin/tags/${this.editandoId()}`, { nombre }).subscribe({
        next: (tagActualizado: Tag) => {
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
      // CREAR
      this.http.post<Tag>(`${this.api}/admin/tags`, { nombre }).subscribe({
        next: (tagNuevo: Tag) => {
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

  eliminarTag(id: number, nombre: string): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar el tag "${nombre}"?`)) {
      return;
    }

    this.http.delete(`${this.api}/admin/tags/${id}`).subscribe({
      next: () => {
        this.tags.update(lista => lista.filter(t => t.id !== id));
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al eliminar el tag');
      }
    });
  }
}
