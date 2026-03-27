export interface Ruta {
  id: number;
  nombre: string;
  descripcion: string | null;
  distancia_km: number | null;
  duracion_estimada_min: number | null;
  dificultad: string | null;
  enlace_maps: string | null;
  gpx_url: string | null;
  mirador_id: number;
  elevacion_ganada: number | null;
  tipo: string | null;
}
