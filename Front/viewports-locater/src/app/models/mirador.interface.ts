import { Provincia } from "./provincia.interface";
import { Tag } from "./tag.interface";

export interface Mirador {
  id: number,
  nombre: string,
  descripcion: string,
  latitud: number,
  longitud: number,
  provincia: Provincia,

  tags?: Tag[];
}
