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

/**
 * Servicio principal de miradores.
 * Centraliza todas las peticiones HTTP relacionadas con miradores, rutas,
 * fotos, valoraciones, tags, provincias y favoritos.
 * Mantiene en memoria el conjunto de IDs de favoritos del usuario mediante un signal
 * para evitar peticiones repetidas al servidor en cada tarjeta de mirador.
 */
@Injectable({
  providedIn: 'root',
})
export class MiradorService {
  public miradores = signal<Mirador[]>([]);
  apiUrl           = environment.apiUrl;
  private http     = inject(HttpClient);

  // signal con los IDs de miradores favoritos del usuario; se carga una vez al autenticarse
  // y se actualiza localmente al añadir o quitar favoritos para evitar peticiones innecesarias
  readonly favoritosIds = signal<Set<number>>(new Set());

  /**
   * Carga los IDs de los favoritos del usuario desde el servidor
   * y los almacena en el signal favoritosIds.
   */
  cargarFavoritosIds(): void {
    this.listarFavoritos().subscribe({
      next: (data) => {
        const ids = new Set<number>(
          (data ?? []).map((fav: any) => fav.mirador_id).filter(Boolean) // filtra valores nulos o undefined
        );
        this.favoritosIds.set(ids);
      },
      error: () => this.favoritosIds.set(new Set()), // en caso de error, resetea a conjunto vacío
    });
  }

  /**
   * Comprueba si un mirador está en los favoritos del usuario
   * consultando el signal local sin hacer petición al servidor.
   */
  esFavorito(miradorId: number): boolean {
    return this.favoritosIds().has(miradorId);
  }

  /**
   * Obtiene todos los tags disponibles en el sistema.
   */
  getTags() {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  /**
   * Obtiene la lista completa de miradores con sus relaciones básicas.
   */
  cargarMiradores() {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores`);
  }

  /**
   * Obtiene los miradores pertenecientes a una provincia concreta.
   */
  miradoresPorProvincia(provinciaId: number) {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/provincia/${provinciaId}`);
  }

  /**
   * Busca miradores cuyo nombre contenga el texto indicado.
   */
  buscarPorNombre(q: string) {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/buscar`, {
      params: { q },
    });
  }

  /**
   * Obtiene la lista completa de provincias.
   */
  getProvincias() {
    return this.http.get<Provincia[]>(`${this.apiUrl}/provincias`);
  }

  /**
   * Obtiene el detalle completo de un mirador incluyendo rutas, fotos y clima.
   */
  getMiradorById(id: number) {
    return this.http.get<MiradorDetalle>(`${this.apiUrl}/miradores/${id}`);
  }

  /**
   * Crea un nuevo mirador en el sistema.
   */
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

  /**
   * Crea una nueva ruta asociada a un mirador.
   * Usa FormData para permitir la subida opcional del fichero GPX junto con los datos.
   */
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
    formData.append('nombre',     data.nombre);
    formData.append('mirador_id', data.mirador_id.toString());
    formData.append('dificultad', data.dificultad);

    // solo añade los campos opcionales si tienen valor para no enviar strings vacíos
    if (data.descripcion)              formData.append('descripcion',           data.descripcion);
    if (data.distancia_km != null)     formData.append('distancia_km',          data.distancia_km.toString());
    if (data.duracion_estimada_min != null) formData.append('duracion_estimada_min', data.duracion_estimada_min.toString());
    if (data.desnivel != null)         formData.append('desnivel',              data.desnivel.toString());
    if (data.gpx_file)                 formData.append('gpx_file',              data.gpx_file);

    return this.http.post<any>(`${this.apiUrl}/rutas`, formData);
  }

  /**
   * Sube una foto asociada a un mirador al almacenamiento del servidor.
   */
  uploadFoto(miradorId: number, file: File) {
    const formData = new FormData();
    formData.append('file',       file);
    formData.append('mirador_id', miradorId.toString());
    return this.http.post<Foto>(`${this.apiUrl}/fotos/upload`, formData);
  }

  /**
   * Asigna (sincroniza) los tags de un mirador reemplazando los anteriores.
   */
  asignarTags(miradorId: number, tagIds: number[]) {
    return this.http.post(`${this.apiUrl}/miradores/${miradorId}/tags`, { tag_ids: tagIds });
  }

  /**
   * Obtiene las valoraciones de un mirador ordenadas por fecha descendente.
   */
  getValoraciones(miradorId: number) {
    return this.http.get<Valoracion[]>(`${this.apiUrl}/miradores/${miradorId}/valoraciones`);
  }

  /**
   * Crea o actualiza la valoración del usuario autenticado sobre un mirador.
   */
  crearValoracion(miradorId: number, data: { puntuacion: number; comentario: string | null }) {
    return this.http.post<Valoracion>(`${this.apiUrl}/miradores/${miradorId}/valoraciones`, data);
  }

  /**
   * Obtiene el detalle completo de una ruta incluyendo su mirador y datos del clima.
   */
  getRutaById(rutaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/rutas/${rutaId}`);
  }

  /**
   * Obtiene todas las rutas asociadas a un mirador concreto.
   */
  getRutasPorMirador(miradorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/miradores/${miradorId}/rutas`);
  }

  /**
   * Descarga el fichero GPX de una ruta como Blob para forzar la descarga en el navegador.
   */
  descargarGpx(rutaId: number) {
    return this.http.get(`${this.apiUrl}/rutas/${rutaId}/descargar-gpx`, {
      responseType: 'blob' // indica al HttpClient que la respuesta es un fichero binario
    });
  }

  /**
   * Elimina un mirador del sistema.
   */
  deleteMirador(miradorId: number) {
    return this.http.delete(`${this.apiUrl}/miradores/${miradorId}`);
  }

  /**
   * Actualiza los datos de un mirador existente.
   */
  updateMirador(miradorId: number, data: {
    nombre?: string;
    descripcion?: string;
    latitud?: number;
    longitud?: number;
    provincia_id?: number;
  }) {
    return this.http.put(`${this.apiUrl}/miradores/${miradorId}`, data);
  }

  /**
   * Elimina una ruta del sistema.
   */
  deleteRuta(rutaId: number) {
    return this.http.delete(`${this.apiUrl}/rutas/${rutaId}`);
  }

  /**
   * Elimina una foto del sistema.
   */
  deleteFoto(fotoId: number) {
    return this.http.delete(`${this.apiUrl}/fotos/${fotoId}`);
  }

  /**
   * Actualiza los datos de una ruta existente.
   * Usa FormData y POST en lugar de PUT para permitir la subida opcional del fichero GPX.
   */
  updateRuta(rutaId: number, data: any): Observable<any> {
    const formData = new FormData();
    formData.append('nombre',     data.nombre);
    formData.append('mirador_id', data.mirador_id);

    // solo añade los campos opcionales si tienen valor
    if (data.distancia_km != null)          formData.append('distancia_km',          data.distancia_km.toString());
    if (data.duracion_estimada_min != null)  formData.append('duracion_estimada_min', data.duracion_estimada_min.toString());
    if (data.desnivel != null)               formData.append('desnivel',              data.desnivel.toString());
    if (data.dificultad)                     formData.append('dificultad',            data.dificultad);
    if (data.gpx_file)                       formData.append('gpx_file',              data.gpx_file);

    // usa POST porque PUT no soporta FormData con ficheros en algunos servidores
    return this.http.post(`${this.apiUrl}/rutas/${rutaId}`, formData);
  }

  /**
   * Actualiza la puntuación y comentario de una valoración existente.
   */
  updateValoracion(valoracionId: number, data: { puntuacion: number; comentario: string }) {
    return this.http.put(`${this.apiUrl}/valoraciones/${valoracionId}`, data);
  }

  /**
   * Elimina una valoración del sistema.
   */
  deleteValoracion(valoracionId: number) {
    return this.http.delete(`${this.apiUrl}/valoraciones/${valoracionId}`);
  }

  /**
   * Actualiza los datos de un mirador existente.
   * Alias de updateMirador con tipado explícito en la respuesta.
   */
  editarMirador(id: number, datos: any): Observable<{ mirador: Mirador; provincia: Provincia }> {
    return this.http.put<{ mirador: Mirador; provincia: Provincia }>(`${this.apiUrl}/miradores/${id}`, datos);
  }

  // ── Favoritos ──────────────────────────────────────────────────────────────

  /**
   * Añade un mirador a los favoritos del usuario.
   * Actualiza el signal local inmediatamente sin esperar a recargar desde el servidor.
   */
  agregarFavorito(miradorId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/favoritos`, { mirador_id: miradorId }).pipe(
      tap(() => this.favoritosIds.update(ids => new Set([...ids, miradorId]))) // añade el ID al set local
    );
  }

  /**
   * Quita un mirador de los favoritos del usuario.
   * Actualiza el signal local inmediatamente sin esperar a recargar desde el servidor.
   */
  quitarFavorito(miradorId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favoritos/${miradorId}`).pipe(
      // crea un nuevo Set sin el ID eliminado; Set es inmutable en signals por lo que hay que crear uno nuevo
      tap(() => this.favoritosIds.update(ids => { const s = new Set(ids); s.delete(miradorId); return s; }))
    );
  }

  /**
   * Verifica si un mirador concreto está en los favoritos del usuario
   * consultando al servidor (útil para verificar el estado inicial).
   */
  verificarFavorito(miradorId: number): Observable<{ es_favorito: boolean }> {
    return this.http.get<{ es_favorito: boolean }>(`${this.apiUrl}/favoritos/check/${miradorId}`);
  }

  /**
   * Obtiene la lista completa de favoritos del usuario con el mirador anidado.
   */
  listarFavoritos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/favoritos`);
  }
}
