import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MiradorService } from '../../../services/mirador-service';
import { ItemMiradorComponent } from '../../components/item-mirador/item-mirador';
import { Mirador } from '../../../models/mirador.interface';

@Component({
  selector: 'app-favoritos',
  imports: [CommonModule, RouterLink, ItemMiradorComponent],
  templateUrl: './favoritos.html',
  styleUrl: './favoritos.css',
})
export class FavoritosComponent implements OnInit {
  private miradorService = inject(MiradorService);

  favoritos = signal<Mirador[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarFavoritos();
  }

cargarFavoritos(): void {
  this.miradorService.listarFavoritos().subscribe({
    next: (data: any[]) => {
      const miradores = (data ?? [])
        .map((fav) => fav.mirador)
        .filter((m) => m && m.id);

      console.log('Miradores extraídos:', miradores);
      this.favoritos.set(miradores);
      this.cargando.set(false);
    },
    error: (err) => {
      console.error('Error:', err);
      this.error.set('Error al cargar favoritos');
      this.cargando.set(false);
    },
  });
}
}
