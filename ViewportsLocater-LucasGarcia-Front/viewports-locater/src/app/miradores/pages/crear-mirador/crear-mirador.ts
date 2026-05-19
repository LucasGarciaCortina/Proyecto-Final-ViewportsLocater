import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { GeolocationService } from '../../../services/geolocation.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { MiradorService } from '../../../services/mirador-service';
import { Provincia } from '../../../models/provincia.interface';
import { Tag } from '../../../models/tag.interface';
import * as L from 'leaflet';

@Component({
  selector: 'app-crear-mirador',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './crear-mirador.html',
  styleUrls: ['./crear-mirador.css'],
})
export class CrearMiradorComponent implements OnInit {
  private miradorService = inject(MiradorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private geoService = inject(GeolocationService);
  private location = inject(Location);

  ubicacionCargando = this.geoService.cargando;
  ubicacionError = this.geoService.error;
  ubicacionDisponible = this.geoService.isLocationAvailable;

  mostrarMapaSelector = signal(false);
  private mapaSelector: L.Map | null = null;
  private marcador: L.Marker | null = null;
  private ubicacionSeleccionada: { lat: string; lng: string } | null = null;

  form!: FormGroup;
  provincias = signal<Provincia[]>([]);
  tags = signal<Tag[]>([]);
  tagsSeleccionados: number[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  miradorIdEditando: number | null = null;

  imagenesSeleccionadas: File[] = [];
  imagenesPreview: { url: string; nombre: string; tamano: number }[] = [];
  imagenError: string | null = null;

  readonly MAX_SIZE_BYTES = 5 * 1024 * 1024;
  readonly TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarProvincias();
    this.cargarTags();
    this.route.params.subscribe(params => {
      const miradorId = params['id'];
      if (miradorId) {
        this.cargarMiradorParaEditar(miradorId);
      }
    });
  }

  private cargarMiradorParaEditar(miradorId: number): void {
    this.miradorService.getMiradorById(miradorId).subscribe({
      next: (res) => {
        const m = res.mirador;

        this.form.patchValue({
          nombre: m.nombre,
          descripcion: m.descripcion,
          provincia_id: m.provincia_id?.toString() || '',
          latitud: m.latitud,
          longitud: m.longitud,
        });

        // Precarga de datos opcionales de la ruta principal
        if (res.rutas && res.rutas.length > 0) {
          const rutaPrincipal = res.rutas[0]; // Primera ruta es la principal
          this.form.patchValue({
            distancia_km: rutaPrincipal.distancia_km,
            duracion_estimada_min: rutaPrincipal.duracion_estimada_min,
            desnivel: rutaPrincipal.desnivel,
            dificultad: rutaPrincipal.dificultad,
          });
        }

        // Precarga de tags
        if (m.tags && m.tags.length > 0) {
          this.tagsSeleccionados = m.tags.map(tag => tag.id);
        }

        // Precarga de fotos
        if (res.fotos && res.fotos.length > 0) {
          this.imagenesPreview = res.fotos.map((foto, index) => ({
            url: foto.url,
            nombre: `Foto ${index + 1}`,
            tamano: 0,
          }));
        }

        this.miradorIdEditando = miradorId;

        // Resetear estado de validación para que no muestre errores sin interacción
        this.form.markAsPristine();
        this.form.markAsUntouched();
      },
      error: (err) => {
        this.error = 'No se pudo cargar el mirador para editar';
        console.error(err);
      }
    });
  }

  inicializarFormulario(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3),Validators.maxLength(150)]],
      descripcion: ['', [Validators.required, Validators.minLength(10),Validators.maxLength(500)]],
      provincia_id: ['', Validators.required],
      latitud: ['', [Validators.required, Validators.pattern(/^-?[0-9]{1,3}\.[0-9]+$/)]],
      longitud: ['', [Validators.required, Validators.pattern(/^-?[0-9]{1,3}\.[0-9]+$/)]],
      distancia_km: [null],
      duracion_estimada_min: [null],
      desnivel: [null],
      dificultad: [''],
    });
  }

  cargarProvincias(): void {
    this.miradorService.getProvincias().subscribe({
      next: (data) => this.provincias.set(data ?? []),
      error: (err) => {
        console.error('Error cargando provincias:', err);
        this.error = 'No se pudieron cargar las provincias';
      },
    });
  }

  cargarTags(): void {
    this.miradorService.getTags().subscribe({
      next: (data) => this.tags.set(data ?? []),
      error: (err) => console.error('Error cargando tags:', err),
    });
  }

  obtenerUbicacion(): void {
    this.geoService.getPosition()
      .then((position) => {
        this.form.patchValue({
          latitud: position.lat.toString(),
          longitud: position.lng.toString(),
        });
      })
      .catch((error) => {
        console.error('Error al obtener ubicación:', error);
      });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.imagenError = null;

    for (const file of files) {
      if (!this.TIPOS_ACEPTADOS.includes(file.type)) {
        this.imagenError = `${file.name}: formato no válido. Solo JPG, PNG y WebP`;
        continue;
      }
      if (file.size > this.MAX_SIZE_BYTES) {
        this.imagenError = `${file.name}: supera los 5MB`;
        continue;
      }
      if (this.imagenesSeleccionadas.length >= 5) {
        this.imagenError = 'Máximo 5 imágenes';
        break;
      }

      this.imagenesSeleccionadas = [...this.imagenesSeleccionadas, file];

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagenesPreview = [...this.imagenesPreview, {
          url: e.target?.result as string,
          nombre: file.name,
          tamano: file.size,
        }];
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  eliminarImagen(index: number): void {
    this.imagenesSeleccionadas = this.imagenesSeleccionadas.filter((_, i) => i !== index);
    this.imagenesPreview = this.imagenesPreview.filter((_, i) => i !== index);
  }
  formatearTamano(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  toggleTag(tagId: number): void {
    const idx = this.tagsSeleccionados.indexOf(tagId);
    if (idx > -1) {
      this.tagsSeleccionados.splice(idx, 1);
    } else {
      this.tagsSeleccionados.push(tagId);
    }
  }

  isTagSeleccionado(tagId: number): boolean {
    return this.tagsSeleccionados.includes(tagId);
  }

  crearMirador(): void {
    if (this.form.invalid) {
      this.error = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    const datos = {
      nombre: this.form.value.nombre.trim(),
      descripcion: this.form.value.descripcion.trim(),
      latitud: parseFloat(this.form.value.latitud),
      longitud: parseFloat(this.form.value.longitud),
      provincia_id: parseInt(this.form.value.provincia_id),
    };

    const distancia = this.form.value.distancia_km;
    const duracion = this.form.value.duracion_estimada_min;
    const dificultad = this.form.value.dificultad;
    const desnivel = this.form.value.desnivel;
    const hayDatosRuta = distancia || duracion;

    let miradorIdFinal: number | null = null;

    const peticion = this.miradorIdEditando
      ? this.miradorService.editarMirador(this.miradorIdEditando, datos)
      : this.miradorService.crearMirador(datos);

    peticion
      .pipe(
        switchMap((res) => {
          const miradorId = this.miradorIdEditando || res.mirador?.id;
          miradorIdFinal = miradorId;
          if (!miradorId) return of(null);

          const acciones = [];

          // Si es creación Y hay datos de ruta, crear ruta nueva
          if (hayDatosRuta && !this.miradorIdEditando) {
            acciones.push(
              this.miradorService
                .crearRuta({
                  nombre: `Ruta principal de ${datos.nombre}`,
                  mirador_id: miradorId,
                  distancia_km: distancia ? parseFloat(distancia) : null,
                  duracion_estimada_min: duracion ? parseInt(duracion) : null,
                  desnivel: desnivel ? parseInt(desnivel) : null,
                  dificultad: dificultad || null,
                })
                .pipe(catchError(() => of(null))),
            );
          }

          // Si es edición Y hay datos de ruta, actualizar ruta existente
          if (hayDatosRuta && this.miradorIdEditando) {
            // Obtener la ruta principal del mirador
            acciones.push(
              this.miradorService.getRutasPorMirador(miradorId).pipe(
                switchMap((rutas: any[]) => {
                  if (rutas.length > 0) {
                    const rutaPrincipal = rutas[0];
                    console.log('Actualizando ruta:', rutaPrincipal.id, {
                      distancia_km: parseFloat(distancia),
                      duracion_estimada_min: parseInt(duracion),
                      desnivel: parseInt(desnivel),
                      dificultad
                    });
                    return this.miradorService.updateRuta(rutaPrincipal.id, {
                      nombre: rutaPrincipal.nombre,
                      mirador_id: miradorId,
                      distancia_km: parseFloat(distancia),
                      duracion_estimada_min: parseInt(duracion),
                      desnivel: parseInt(desnivel),
                      dificultad: dificultad,
                    });
                  }
                  return of(null);
                }),
                catchError((err) => {
                  console.error('Error actualizando ruta:', err);
                  return of(null);
                })
              )
            );
          }
          if (this.imagenesSeleccionadas.length > 0) {
            for (const img of this.imagenesSeleccionadas) {
              acciones.push(
                this.miradorService.uploadFoto(miradorId, img).pipe(catchError(() => of(null))),
              );
            }
          }

          if (this.tagsSeleccionados.length > 0) {
            acciones.push(
              this.miradorService
                .asignarTags(miradorId, this.tagsSeleccionados)
                .pipe(catchError(() => of(null))),
            );
          }

          return acciones.length > 0 ? forkJoin(acciones) : of(null);
        }),
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.success = '✓ Mirador ' + (this.miradorIdEditando ? 'actualizado' : 'creado') + ' exitosamente';
          this.form.reset();
          this.imagenesSeleccionadas = [];
          this.imagenesPreview = [];
          this.tagsSeleccionados = [];
          setTimeout(() => {
            if (miradorIdFinal) {
              this.router.navigate(['/miradores', miradorIdFinal]);
            } else {
              this.router.navigate(['/home']);
            }
          }, 2000);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message || 'Error al guardar el mirador. Intenta de nuevo.';
        },
      });
  }

  cancelar(): void {
    if (this.miradorIdEditando) {
      this.router.navigate(['/miradores', this.miradorIdEditando]);
    } else {
      this.router.navigate(['/home']);
    }
  }

  obtenerErrorCampo(campo: string): string {
    const control = this.form.get(campo);

    if (!control || !control.errors || !control.touched) {
      return '';
    }


    if (control.errors['required']) {
      // Mostrar nombre amigable para provincia_id
      if (campo === 'provincia_id') {
        return 'Provincia es obligatoria';
      }
      return `${this.capitalize(campo)} es obligatorio`;
    }

    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `${this.capitalize(campo)} debe tener al menos ${minLength} caracteres`;
    }

    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `${this.capitalize(campo)} no puede exceder ${maxLength} caracteres`;
    }

    if (control.errors['pattern']) {
      return `${this.capitalize(campo)} debe ser un número válido (ej: 42.3452)`;
    }

    return 'Campo inválido';
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  abrirSelectorMapa(): void {
    this.mostrarMapaSelector.set(true);
    // Esperar a que el DOM se renderice
    setTimeout(() => this.inicializarMapaSelector(), 100);
  }


  private inicializarMapaSelector(): void {
    const container = document.getElementById('mapa-selector');
    if (!container || this.mapaSelector) return;

    this.mapaSelector = L.map('mapa-selector').setView([40.4637, -3.7492], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.mapaSelector);

    // Clickear en el mapa para seleccionar ubicación
    this.mapaSelector.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);

      // SOLO GUARDAR TEMPORALMENTE
      this.ubicacionSeleccionada = { lat, lng };

      // Actualizar marcador
      if (this.marcador) {
        this.mapaSelector?.removeLayer(this.marcador);
      }
      this.marcador = L.marker([parseFloat(lat), parseFloat(lng)])
        .addTo(this.mapaSelector!)
        .bindPopup(`<b>Ubicación seleccionada</b><br>Lat: ${lat}<br>Lng: ${lng}`)
        .openPopup();
    });
  }

  aceptarUbicacion(): void {
    // APLICAR AL FORM SOLO CUANDO ACEPTES
    if (this.ubicacionSeleccionada) {
      this.form.patchValue({
        latitud: this.ubicacionSeleccionada.lat,
        longitud: this.ubicacionSeleccionada.lng,
      });
      this.ubicacionSeleccionada = null; // Limpiar
    }
    this.cerrarSelectorMapa();
  }

  cerrarSelectorMapa(): void {
    this.mostrarMapaSelector.set(false);
    this.ubicacionSeleccionada = null;
    if (this.mapaSelector) {
      this.mapaSelector.remove();
      this.mapaSelector = null;
    }
  }
}
