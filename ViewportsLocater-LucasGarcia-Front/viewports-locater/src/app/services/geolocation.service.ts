import { Injectable, signal, computed } from '@angular/core';

/**
 * Interfaz que representa la posición GPS del usuario.
 */
export interface UserPosition {
  lat: number;
  lng: number;
}

/**
 * Servicio de geolocalización.
 * Gestiona la obtención de la posición GPS del usuario mediante la API
 * de geolocalización del navegador y expone el estado mediante signals reactivos.
 * También calcula distancias desde la posición del usuario a coordenadas concretas.
 */
@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  // signals privados que almacenan el estado de la geolocalización
  private _position = signal<UserPosition | null>(null);
  private _cargando = signal(false);
  private _error    = signal<string | null>(null);

  // signals públicos de solo lectura para que los componentes puedan suscribirse sin modificarlos
  readonly userPosition       = this._position.asReadonly();
  readonly cargando           = this._cargando.asReadonly();
  readonly error              = this._error.asReadonly();
  readonly isLocationAvailable = computed(() => this._position() !== null); // true si ya se obtuvo la posición

  /**
   * Comprueba si el navegador soporta la API de geolocalización.
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Solicita la posición GPS actual del usuario al navegador.
   * Actualiza los signals de estado durante el proceso y devuelve una Promise
   * que resuelve con la posición o rechaza con el mensaje de error correspondiente.
   */
  getPosition(): Promise<UserPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        const msg = 'Geolocalización no disponible en este navegador.';
        this._error.set(msg);
        reject(new Error(msg));
        return;
      }

      this._cargando.set(true);
      this._error.set(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: UserPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          this._position.set(position);
          this._cargando.set(false);
          resolve(position);
        },
        (err) => {
          this._cargando.set(false);
          // traduce los códigos de error de la API a mensajes legibles en español
          let msg: string;
          switch (err.code) {
            case GeolocationPositionError.PERMISSION_DENIED:
              msg = 'Permiso de ubicación denegado.';
              break;
            case GeolocationPositionError.POSITION_UNAVAILABLE:
              msg = 'Ubicación no disponible.';
              break;
            case GeolocationPositionError.TIMEOUT:
              msg = 'Tiempo de espera agotado al obtener ubicación.';
              break;
            default:
              msg = 'Error al obtener la ubicación.';
          }
          this._error.set(msg);
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true, // usa GPS si está disponible en lugar de WiFi/IP
          timeout: 10000,           // máximo 10 segundos de espera
          maximumAge: 60000         // acepta una posición cacheada de hasta 1 minuto de antigüedad
        }
      );
    });
  }

  /**
   * Calcula la distancia en km entre la posición actual del usuario
   * y las coordenadas indicadas usando la fórmula de Haversine.
   * Devuelve null si la posición del usuario no está disponible.
   */
  getDistanceTo(lat: number, lng: number): number | null {
    const pos = this._position();
    if (!pos) return null;
    return this.haversine(pos.lat, pos.lng, lat, lng);
  }

  /**
   * Implementación de la fórmula de Haversine para calcular la distancia
   * en kilómetros entre dos puntos en la superficie de la Tierra.
   */
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R     = 6371; // radio de la Tierra en kilómetros
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
