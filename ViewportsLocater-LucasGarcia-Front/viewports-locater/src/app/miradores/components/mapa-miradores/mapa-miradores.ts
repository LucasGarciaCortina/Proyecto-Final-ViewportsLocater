import { Component, OnInit, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Mirador } from '../../../models/mirador.interface';

@Component({
  selector: 'app-mapa-miradores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa-miradores.html',
  styleUrls: ['./mapa-miradores.css'],
})

export class MapaMiradoresnComponent implements OnInit, OnChanges {
  @Input() miradores: Mirador[] = [];

  private mapa: L.Map | null = null;
  private markers: L.Marker[] = [];

  ngOnInit(): void {
    this.inicializarMapa();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['miradores'] && !changes['miradores'].firstChange) {
      this.actualizarMarkers();
    }
  }

  private inicializarMapa(): void {
    setTimeout(() => {
      if (this.mapa) return;

      // ✅ Configurar iconos de Leaflet
      const defaultIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.setIcon(defaultIcon);

      this.mapa = L.map('mapa-home').setView([40.46, -3.75], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.mapa);

      setTimeout(() => this.actualizarMarkers(), 100);
    });
  }

  private actualizarMarkers(): void {
    if (!this.mapa) {
      return;
    }

    // Eliminar markers antiguos
    this.markers.forEach(m => m.remove());
    this.markers = [];

    // Añadir nuevos markers
    this.miradores.forEach(mirador => {
      const marker = L.marker([mirador.latitud as number, mirador.longitud as number])
        .addTo(this.mapa!);

      let popupHTML = `
        <div style="font-family: Arial, sans-serif; min-width: 180px; max-width: 220px;">
          ${mirador.fotos && mirador.fotos.length > 0
            ? `<img src="${mirador.fotos[0].url}" alt="${mirador.nombre}"
                style="width:100%; height:100px; object-fit:cover; border-radius:8px 8px 0 0; display:block; margin-bottom:8px;" />`
            : ''}
          <div style="padding: 0 4px 4px;">
            <div style="font-weight:700; font-size:14px; color:#0F6E56; margin-bottom:4px;">
              ${mirador.nombre}
            </div>
            <div style="font-size:12px; color:#555; margin-bottom:4px;">
              📍 ${mirador.provincia?.nombre || 'Sin provincia'}
            </div>
            ${mirador.valoraciones_avg_puntuacion
              ? `<div style="font-size:12px; color:#f59e0b; margin-bottom:8px;">
                  ${'★'.repeat(Math.round(mirador.valoraciones_avg_puntuacion))}${'☆'.repeat(5 - Math.round(mirador.valoraciones_avg_puntuacion))}
                  <span style="color:#555; margin-left:4px;">${Number(mirador.valoraciones_avg_puntuacion).toFixed(1)}</span>
                </div>`
              : `<div style="font-size:12px; color:#aaa; margin-bottom:8px;">Sin valoraciones</div>`
            }
            ${mirador.tags && mirador.tags.length > 0
              ? `<div style="margin-bottom:8px; display:flex; flex-wrap:wrap; gap:4px;">
                  ${mirador.tags.slice(0,3).map((t: any) =>
                    `<span style="background:#e8f5ee; color:#0F6E56; font-size:10px; padding:2px 6px; border-radius:10px;">${t.nombre}</span>`
                  ).join('')}
                </div>`
              : ''}
            <a href="/miradores/${mirador.id}"
              style="display:block; text-align:center; background:#1D9E75; color:white; font-size:12px;
                     font-weight:600; padding:6px 10px; border-radius:6px; text-decoration:none;">
              Ver detalles →
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHTML);
      this.markers.push(marker);
    });

    // Ajustar zoom a todos los markers
    if (this.miradores.length > 0 && this.markers.length > 0) {
      const group = new L.FeatureGroup(this.markers);
      this.mapa.fitBounds(group.getBounds().pad(0.1));
    }
  }
}
