import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

    // Base: tags > dificultad > provincia > todos
    const base$ =
      tagIds.length > 0
        ? this.miradorService.miradoresPorTags(tagIds)
        : this.dificultad !== ''
          ? this.miradorService.miradoresPorDificultad(this.dificultad)
          : this.provinciaId !== ''
            ? this.miradorService.miradoresPorProvincia(this.provinciaId)
            : this.miradorService.cargarMiradores();

    const cargarBase = (): Promise<Mirador[]> =>
      new Promise((resolve, reject) => {
        base$.subscribe({
          next: (d) => resolve(d ?? []),
          error: (e) => reject(e),
        });
      });

    try {
      let base = await cargarBase();

      // Apply text filter on top of any base dataset
      if (texto.length > 0) {
        const textoBusqueda = texto.toLowerCase();
        base = base.filter(
          (m) =>
            m.nombre.toLowerCase().includes(textoBusqueda) ||
            m.descripcion.toLowerCase().includes(textoBusqueda)
        );
      }

      // Orden "cercanos" requiere ubicación + endpoint
      if (this.orden === 'cercanos') {
        const pos = await this.getPosicion();
        this.miradorService.ordenarPorCercania(pos.lat, pos.lng).subscribe({
          next: (ordenada) => {
            // Mantener filtros: intersección por id
            const baseIds = new Set(base.map((m) => m.id));
            const final = (ordenada ?? []).filter((m) => baseIds.has(m.id));
            this.miradores.set(final);
            this.cargando.set(false);
          },
          error: (err) => {
            console.error(err);
            this.error.set('No se pudo ordenar por cercanía.');
            this.cargando.set(false);
          },
        });
        return;
      }

      const orden$ =
        this.orden === 'valoracion'
          ? this.miradorService.ordenarPorValoracion()
          : this.orden === 'dificultad'
            ? this.miradorService.ordenarPorDificultad()
            : this.miradorService.ordenarPorNombre();

      orden$.subscribe({
        next: (ordenada) => {
          const baseIds = new Set(base.map((m) => m.id));
          const final = (ordenada ?? []).filter((m) => baseIds.has(m.id));
          this.miradores.set(final);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error(err);
          this.miradores.set(base);
          this.cargando.set(false);
        },
      });
    } catch (err) {
      console.error(err);
      this.error.set('Error aplicando filtros.');
      this.cargando.set(false);
    }
  }

  async aplicarRadio() {
    this.cargando.set(true);
    this.error.set(null);

    try {
      const pos = await this.getPosicion();
      this.miradorService.filtrarPorRadio(pos.lat, pos.lng, this.radioKm).subscribe({
        next: (data) => {
          this.miradores.set(data ?? []);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('No se pudo filtrar por radio.');
          this.cargando.set(false);
        },
      });
    } catch (err) {
      console.error(err);
      this.error.set('No se pudo obtener tu ubicación.');
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
