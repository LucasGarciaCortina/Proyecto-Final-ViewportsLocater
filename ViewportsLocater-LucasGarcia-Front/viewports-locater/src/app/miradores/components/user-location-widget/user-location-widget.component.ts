import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeolocationService, UserPosition } from '../../../services/geolocation.service';

@Component({
  selector: 'app-user-location-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-location-widget.component.html',
  styleUrls: ['./user-location-widget.component.css'],
})
export class UserLocationWidgetComponent {
  private geoService = inject(GeolocationService);

  posicion = this.geoService.userPosition;
  cargando = this.geoService.cargando;
  error = this.geoService.error;
  disponible = this.geoService.isLocationAvailable;

  posicionActualizada = output<UserPosition>();

  async actualizarUbicacion() {
    try {
      const pos = await this.geoService.getPosition();
      this.posicionActualizada.emit(pos);
    } catch {
      // error is already set on the service signal
    }
  }
}
