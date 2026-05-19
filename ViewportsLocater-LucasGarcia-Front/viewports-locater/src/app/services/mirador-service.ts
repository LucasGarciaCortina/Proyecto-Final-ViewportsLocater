import { inject, Injectable, signal } from '@angular/core';
import { Mirador } from '../models/mirador.interface';
import { HttpClient } from '@angular/common/http';
import { Provincia } from '../models/provincia.interface';
import { Tag } from '../models/tag.interface';
import { Foto } from '../models/foto.interface';
import { MiradorDetalle } from '../models/mirador_detalle.interface';
import { Valoracion } from '../models/valoracion.interface';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MiradorService {
  public miradores = signal<Mirador[]>([]);
  apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  // Se carga una sola vez cuando el usuario está logueado y lo actualizan los métodos (quitar/agregar)
  readonly favoritosIds = signal<Set<number>>(new Set());

  cargarFavoritosIds(): void {
    this.listarFavoritos().subscribe({
      next: (data) => {
        const ids = new Set<number>(
          (data ?? []).map((fav: any) => fav.mirador_id).filter(Boolean)
        );
        this.favoritosIds.set(ids);
      },
      error: () => this.favoritosIds.set(new Set()),
    });
  }

  esFavorito(miradorId: number): boolean {
    return this.favoritosIds().has(miradorId);
  }


  getTags() {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  cargarMiradores() {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores`);
  }

  miradoresPorProvincia(provinciaId: number) {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/provincia/${provinciaId}`);
  }

  buscarPorNombre(q: string) {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/buscar`, {
      params: { q },
    });
  }

  getProvincias() {
    return this.http.get<Provincia[]>(`${this.apiUrl}/provincias`);
  }

  getMiradorById(id: number) {
    return this.http.get<MiradorDetalle>(`${this.apiUrl}/miradores/${id}`);
  }

  crearMirador(data: {
    nombre: string,
    descripcion: string,
    latitud: number,
    longitud: number,
    provincia_id: number,
    dificultad?: string,
  }) {
    return this.http.post<{ mirador: Mirador, provincia: Provincia }>(`${this.apiUrl}/miradores`, data);
  }

  crearRuta(data: {
    nombre: string;
    mirador_id: number;
    descripcion?: string | null;
    distancia_km?: number | null;
    duracion_estimada_min?: number | null;
    desnivel: number | null;
    dificultad: string;
    gpx_file?: File | null;
  }) {
    const formData = new FormData();
    formData.append('nombre', data.nombre);
    formData.append('mirador_id', data.mirador_id.toString());
    formData.append('dificultad', data.dificultad);

    if (data.descripcion) formData.append('descripcion', data.descripcion);
    if (data.distancia_km != null) formData.append('distancia_km', data.distancia_km.toString());
    if (data.duracion_estimada_min != null) formData.append('duracion_estimada_min', data.duracion_estimada_min.toString());
    if (data.desnivel != null) formData.append('desnivel', data.desnivel.toString());
    if (data.gpx_file) formData.append('gpx_file', data.gpx_file);

    return this.http.post<any>(`${this.apiUrl}/rutas`, formData);
  }

  uploadFoto(miradorId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mirador_id', miradorId.toString());
    return this.http.post<Foto>(`${this.apiUrl}/fotos/upload`, formData);
  }

  asignarTags(miradorId: number, tagIds: number[]) {
    return this.http.post(`${this.apiUrl}/miradores/${miradorId}/tags`, { tag_ids: tagIds });
  }

  getValoraciones(miradorId: number) {
    return this.http.get<Valoracion[]>(`${this.apiUrl}/miradores/${miradorId}/valoraciones`);
  }

  crearValoracion(miradorId: number, data: { puntuacion: number; comentario: string | null }) {
    return this.http.post<Valoracion>(`${this.apiUrl}/miradores/${miradorId}/valoraciones`, data);
  }

  getRutaById(rutaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/rutas/${rutaId}`);
  }
  getRutasPorMirador(miradorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/miradores/${miradorId}/rutas`);
  }
  descargarGpx(rutaId: number) {
    return this.http.get(`${this.apiUrl}/rutas/${rutaId}/descargar-gpx`, {
      responseType: 'blob'
    });
  }

  // Eliminar mirador
  deleteMirador(miradorId: number) {
    return this.http.delete(`${this.apiUrl}/miradores/${miradorId}`);
  }

  // Actualizar mirador
  updateMirador(miradorId: number, data: {
    nombre?: string;
    descripcion?: string;
    latitud?: number;
    longitud?: number;
    provincia_id?: number;
  }) {
    return this.http.put(`${this.apiUrl}/miradores/${miradorId}`, data);
  }

  // Eliminar ruta
  deleteRuta(rutaId: number) {
    return this.http.delete(`${this.apiUrl}/rutas/${rutaId}`);
  }

  // Actualizar ruta
  updateRuta(rutaId: number, data: any): Observable<any> {
    const formData = new FormData();
    formData.append('nombre', data.nombre);
    formData.append('mirador_id', data.mirador_id);

    if (data.distancia_km != null) formData.append('distancia_km', data.distancia_km.toString());
    if (data.duracion_estimada_min != null) formData.append('duracion_estimada_min', data.duracion_estimada_min.toString());
    if (data.desnivel != null) formData.append('desnivel', data.desnivel.toString());
    if (data.dificultad) formData.append('dificultad', data.dificultad);
    if (data.gpx_file) formData.append('gpx_file', data.gpx_file);

    return this.http.post(`${this.apiUrl}/rutas/${rutaId}`, formData);
  }
  updateValoracion(valoracionId: number, data: { puntuacion: number; comentario: string }) {
    return this.http.put(`${this.apiUrl}/valoraciones/${valoracionId}`, data);
  }

  deleteValoracion(valoracionId: number) {
    return this.http.delete(`${this.apiUrl}/valoraciones/${valoracionId}`);
  }

  editarMirador(id: number, datos: any): Observable<{ mirador: Mirador; provincia: Provincia }> {
    return this.http.put<{ mirador: Mirador; provincia: Provincia }>(`${this.apiUrl}/miradores/${id}`, datos);
  }

  // Favoritos
  agregarFavorito(miradorId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/favoritos`, { mirador_id: miradorId }).pipe(
      tap(() => this.favoritosIds.update(ids => new Set([...ids, miradorId])))
    );
  }

  quitarFavorito(miradorId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favoritos/${miradorId}`).pipe(
      tap(() => this.favoritosIds.update(ids => { const s = new Set(ids); s.delete(miradorId); return s; }))
    );
  }

  verificarFavorito(miradorId: number): Observable<{ es_favorito: boolean }> {
    return this.http.get<{ es_favorito: boolean }>(`${this.apiUrl}/favoritos/check/${miradorId}`);
  }

  listarFavoritos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/favoritos`);
  }

}
