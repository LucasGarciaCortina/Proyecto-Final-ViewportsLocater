export interface Valoracion {
  id: number;
  mirador_id: number;
  usuario: string;
  puntuacion: number;
  comentario: string | null;
  created_at: string;
}
