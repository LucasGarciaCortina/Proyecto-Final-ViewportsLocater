import { inject, Injectable, signal } from '@angular/core';
import { Mirador } from '../models/mirador.interface';
import { HttpClient } from '@angular/common/http';
import { Provincia } from '../models/provincia.interface';
import { Tag } from '../models/tag.interface';
import { MiradorDetalle } from '../models/mirador_detalle.interface';
import { Valoracion } from '../models/valoracion.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MiradorService {
  public miradores = signal<Mirador[]>([]);
  apiUrl = environment.apiUrl;
  private http = inject(HttpClient);


  getTags() {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`);
  }

  miradoresPorTags(tagIds: number[]) {
    return this.http.post<Mirador[]>(`${this.apiUrl}/miradores/tags`, {
      tags: tagIds
    });
  }

  cargarMiradores() {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores`);
  }

  miradoresPorProvincia(provinciaId: number) {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/provincia/${provinciaId}`);
  }

  miradoresPorDificultad(dificultad: string) {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/dificultad/${dificultad}`);
  }

  buscarPorNombre(q: string) {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/buscar`, {
      params: { q },
    });
  }

  ordenarPorValoracion() {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/ordenar/valoracion`);
  }

  ordenarPorNombre() {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/ordenar/nombre`);
  }

  ordenarPorDificultad() {
    return this.http.get<Mirador[]>(`${this.apiUrl}/miradores/ordenar/dificultad`);
  }

  ordenarPorCercania(latitud: number, longitud: number) {
    return this.http.post<Mirador[]>(`${this.apiUrl}/miradores/ordenar/cercano`, {
      latitud,
      longitud,
    });
  }

  filtrarPorRadio(latitud: number, longitud: number, distancia_km: number) {
    return this.http.post<Mirador[]>(`${this.apiUrl}/miradores/radio`, {
      latitud,
      longitud,
      radio: distancia_km,
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
  }) {
    return this.http.post<Mirador>(`${this.apiUrl}/miradores`, data);
  }

  getValoraciones(miradorId: number) {
    return this.http.get<Valoracion[]>(`${this.apiUrl}/miradores/${miradorId}/valoraciones`);
  }

  crearValoracion(miradorId: number, data: { usuario: string; puntuacion: number; comentario: string | null }) {
    return this.http.post<Valoracion>(`${this.apiUrl}/miradores/${miradorId}/valoraciones`, data);
  }

}
