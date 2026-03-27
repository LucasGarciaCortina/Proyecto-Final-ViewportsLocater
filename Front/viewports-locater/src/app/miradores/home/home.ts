import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { MiradorService } from '../../services/mirador-service';
import { Provincia } from '../../models/provincia.interface';
import { Mirador } from '../../models/mirador.interface';
import { Tag } from '../../models/tag.interface';
import { ItemMiradorComponent } from '../components/item-mirador/item-mirador';


type Orden = 'valoracion' | 'cercanos' | 'nombre' | 'dificultad';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule,ItemMiradorComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit {
  private miradorService = inject(MiradorService);

  miradores = signal<Mirador[]>([]);
  provincias = signal<Provincia[]>([]);

  tagsDisponibles = signal<Tag[]>([]);
  selectedTagIds = signal<number[]>([]);

  cargando = signal(false);
  error = signal<string | null>(null);

  q = '';
  provinciaId: number | '' = '';
  dificultad: string | '' = '';
  orden: Orden = 'nombre';
  radioKm = 50;

  filtrosVisibles = true;
  filtrosTagVisibles = false;

  ngOnInit(): void {
    this.cargarProvincias();
    this.cargarTags();
    this.cargarMiradoresInicial();
  }

  cargarTags() {
    this.miradorService.getTags().subscribe({
      next: (data) => this.tagsDisponibles.set(data ?? []),
      error: (err) => {
        console.error(err);
        this.tagsDisponibles.set([]);
      }
    });
  }

  private cargarMiradoresInicial(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.miradorService.cargarMiradores().subscribe({
      next: (data) => {
        this.miradores.set(data ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudieron cargar los miradores');
        this.cargando.set(false);
      },
    });
  }

  toggleFiltros() {
    this.filtrosVisibles = !this.filtrosVisibles;
  }

  toggleFiltrosTags() {
    this.filtrosTagVisibles = !this.filtrosTagVisibles;
  }

  isTagSelected(id: number) {
    return this.selectedTagIds().includes(id);
  }

  toggleTag(id: number) {
    const curr = this.selectedTagIds();
    this.selectedTagIds.set(curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  }

  clearTags() {
    this.selectedTagIds.set([]);
  }

  cargarProvincias() {
    this.miradorService.getProvincias().subscribe({
      next: (data) => this.provincias.set(data ?? []),
      error: (err) => {
        console.error(err);
        this.provincias.set([]);
      },
    });
  }

  async aplicarFiltros() {
    this.cargando.set(true);
    this.error.set(null);

    const texto = this.q.trim();
    const tagIds = this.selectedTagIds();

    try {
      // 1. Load all miradores as the base dataset
      let base = await firstValueFrom(this.miradorService.cargarMiradores()).then(d => (d ?? []).filter(m => m?.id != null));

      // 2. Filter by tags client-side (tags are embedded in the base response)
      if (tagIds.length > 0) {
        base = base.filter(m =>
          tagIds.every(tagId => (m.tags?.some(t => t.id === tagId) ?? false))
        );
      }

      // 3. Filter by provincia client-side (provincia is embedded in the base response)
      if (this.provinciaId !== '') {
        base = base.filter(m => m.provincia?.id === this.provinciaId);
      }

      // 4. Filter by dificultad (backend-assisted: dificultad lives on rutas, not miradores)
      if (this.dificultad !== '') {
        const difMiradores = await firstValueFrom(this.miradorService.miradoresPorDificultad(this.dificultad)).then(d => (d ?? []).filter(m => m?.id != null));
        const difIds = new Set(difMiradores.map(m => m.id));
        base = base.filter(m => difIds.has(m.id));
      }

      // 5. Filter by text client-side
      if (texto.length > 0) {
        const textoBusqueda = texto.toLowerCase();
        base = base.filter(m =>
          m.nombre.toLowerCase().includes(textoBusqueda) ||
          m.descripcion.toLowerCase().includes(textoBusqueda)
        );
      }

      // 6. Apply radius filter and proximity ordering when ordering by nearest
      if (this.orden === 'cercanos') {
        const pos = await this.getPosicion();

        const radioData = await firstValueFrom(this.miradorService.filtrarPorRadio(pos.lat, pos.lng, this.radioKm)).then(d => d ?? []);
        const radioIds = new Set(radioData.map(m => m.id));
        base = base.filter(m => radioIds.has(m.id));

        const ordenada = await firstValueFrom(this.miradorService.ordenarPorCercania(pos.lat, pos.lng)).then(d => d ?? []);
        const baseIds = new Set(base.map(m => m.id));
        this.miradores.set(ordenada.filter(m => baseIds.has(m.id)));
        this.cargando.set(false);
        return;
      }

      // 7. Apply ordering on the filtered result
      const orden$ =
        this.orden === 'valoracion'
          ? this.miradorService.ordenarPorValoracion()
          : this.orden === 'dificultad'
            ? this.miradorService.ordenarPorDificultad()
            : this.miradorService.ordenarPorNombre();

      try {
        const ordenada = await firstValueFrom(orden$).then(d => d ?? []);
        const baseIds = new Set(base.map(m => m.id));
        this.miradores.set(ordenada.filter(m => baseIds.has(m.id)));
      } catch (err) {
        console.error(err);
        this.miradores.set(base);
      }
      this.cargando.set(false);
    } catch (err) {
      console.error(err);
      this.error.set('Error aplicando filtros.');
      this.cargando.set(false);
    }
  }

  private getPosicion(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject();
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}
