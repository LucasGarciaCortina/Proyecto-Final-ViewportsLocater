import { Injectable, signal, computed } from '@angular/core';

export interface UserPosition {
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private _position = signal<UserPosition | null>(null);
  private _cargando = signal(false);
  private _error = signal<string | null>(null);

  readonly userPosition = this._position.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLocationAvailable = computed(() => this._position() !== null);

  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Calculates the distance in km between the user's current position
   * and the given coordinates using the Haversine formula.
   */
  getDistanceTo(lat: number, lng: number): number | null {
    const pos = this._position();
    if (!pos) return null;
    return this.haversine(pos.lat, pos.lng, lat, lng);
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
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
