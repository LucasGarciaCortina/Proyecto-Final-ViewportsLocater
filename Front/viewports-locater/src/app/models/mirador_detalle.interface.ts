import { Mirador } from './mirador.interface';
import { Provincia } from './provincia.interface';
import { Ruta } from './ruta.interface';
import { Foto } from './foto.interface';

export interface MiradorDetalle {
  mirador: Mirador;
  provincia: Provincia;
  rutas: Ruta[];
  fotos: Foto[];
}
