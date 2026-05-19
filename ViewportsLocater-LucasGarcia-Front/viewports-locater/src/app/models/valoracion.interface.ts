export interface Valoracion {
  id: number;
  mirador_id: number;
  puntuacion: number;
  comentario: string | null;
  created_at: string;
  user?: { id: number; name: string };
}
