import { Foto } from "./foto.interface";
import { Provincia } from "./provincia.interface";
import { Tag } from "./tag.interface";

export interface Clima {
  temperatura: number;
  condicion: string;
  descripcion: string;
}

export interface Mirador {
  id: number,
  nombre: string,
  descripcion: string,
  latitud: number,
  longitud: number,
  provincia_id: number;
  user_id: number,
  provincia?: Provincia,
  tags?: Tag[];
  fotos?: Foto[];
  rutas?: any[];
  valoraciones_avg_puntuacion?: number;
  distancia?: number;
  clima?: Clima;
}
