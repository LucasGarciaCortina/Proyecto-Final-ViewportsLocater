import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeolocationService, UserPosition } from '../../../services/geolocation.service';

/**
 * Componente widget de ubicación del usuario.
 * Muestra el estado de la geolocalización y permite al usuario
 * solicitar su posición actual, emitiendo el resultado al componente padre.
 */
@Component({
  selector: 'app-user-location-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-location-widget.component.html',
  styleUrls: ['./user-location-widget.component.css'],
})
export class UserLocationWidgetComponent {
  private geoService = inject(GeolocationService);

  // signals del servicio expuestos directamente al template sin duplicar estado
  posicion   = this.geoService.userPosition;
  cargando   = this.geoService.cargando;
  error      = this.geoService.error;
  disponible = this.geoService.isLocationAvailable; // indica si el navegador soporta geolocalización

  posicionActualizada = output<UserPosition>(); // evento que notifica al padre cuando se obtiene la posición

  /**
   * Solicita la posición actual del usuario al navegador y emite el resultado al padre.
   * Los errores se gestionan en el servicio y se reflejan en el signal 'error'.
   */
  async actualizarUbicacion() {
    try {
      const pos = await this.geoService.getPosition();
      this.posicionActualizada.emit(pos);
    } catch {
      // el error ya queda registrado en el signal del servicio, no es necesario gestionarlo aquí
    }
  }
}
