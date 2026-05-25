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

/**
 * Componente de creación y edición de miradores.
 * Si se accede con un ID en la ruta, carga el mirador para edición.
 * Si no, muestra el formulario vacío para crear uno nuevo.
 * Gestiona también la subida de fotos, asignación de tags y creación/edición de la ruta principal.
 */
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

  // signals del servicio de geolocalización expuestos directamente al template
  ubicacionCargando = this.geoService.cargando;
  ubicacionError = this.geoService.error;
  ubicacionDisponible = this.geoService.isLocationAvailable;

  // signals y estado del selector de ubicación en el mapa
  mostrarMapaSelector = signal(false);
  private mapaSelector: L.Map | null = null;
  private marcador: L.Marker | null = null;
  private ubicacionSeleccionada: { lat: string; lng: string } | null = null; // ubicación temporal pendiente de confirmar

  form!: FormGroup;
  provincias = signal<Provincia[]>([]);
  tags = signal<Tag[]>([]);
  tagsSeleccionados: number[] = [];

  loading: boolean = false;
  error: string | null = null;
  success: string | null = null;

  miradorIdEditando: number | null = null; // null si es creación, número si es edición

  // estado de las imágenes seleccionadas y su previsualización
  imagenesSeleccionadas: File[] = [];
  imagenesPreview: { url: string; nombre: string; tamano: number; fotoId?: number }[] = [];
  imagenError: string | null = null;

  readonly MAX_SIZE_BYTES = 5 * 1024 * 1024;                             // 5 MB máximo por imagen
  readonly TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];   // formatos permitidos

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarProvincias();
    this.cargarTags();
    // detecta si se está editando un mirador existente a partir del parámetro 'id' de la ruta
    this.route.params.subscribe(params => {
      const miradorId = params['id'];
      if (miradorId) {
        this.cargarMiradorParaEditar(miradorId);
      }
    });
  }

  /**
   * Carga los datos de un mirador existente y los precarga en el formulario para edición.
   * También precarga la ruta principal, los tags y las fotos existentes.
   */
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

        // precarga los datos de la primera ruta como ruta principal
        if (res.rutas && res.rutas.length > 0) {
          const rutaPrincipal = res.rutas[0];
          this.form.patchValue({
            distancia_km: rutaPrincipal.distancia_km,
            duracion_estimada_min: rutaPrincipal.duracion_estimada_min,
            desnivel: rutaPrincipal.desnivel,
            dificultad: rutaPrincipal.dificultad,
          });
        }

        // precarga los IDs de los tags asignados al mirador
        if (m.tags && m.tags.length > 0) {
          this.tagsSeleccionados = m.tags.map(tag => tag.id);
        }

        // precarga las fotos existentes con su ID para poder eliminarlas del servidor si es necesario
        if (res.fotos && res.fotos.length > 0) {
          this.imagenesPreview = res.fotos.map((foto, index) => ({
            url: foto.url,
            nombre: `Foto ${index + 1}`,
            tamano: 0,        // las fotos ya subidas no tienen tamaño disponible en cliente
            fotoId: foto.id,  // fotoId indica que ya existe en el servidor
          }));
        }

        this.miradorIdEditando = miradorId;

        // resetea el estado de validación para no mostrar errores antes de que el usuario interactúe
        this.form.markAsPristine();
        this.form.markAsUntouched();
      },
      error: (err) => {
        this.error = 'No se pudo cargar el mirador para editar';
        console.error(err);
      }
    });
  }

  /**
   * Inicializa el formulario reactivo con sus validadores.
   * Los campos de ruta son opcionales (sin Validators.required).
   */
  inicializarFormulario(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      provincia_id: ['', Validators.required],
      latitud: ['', [Validators.required, Validators.pattern(/^-?[0-9]{1,3}\.[0-9]+$/)]],  // formato decimal válido
      longitud: ['', [Validators.required, Validators.pattern(/^-?[0-9]{1,3}\.[0-9]+$/)]],
      // campos opcionales de la ruta principal
      distancia_km: [null, [Validators.min(0.1), Validators.max(9999)]],
      duracion_estimada_min: [null, [Validators.min(1), Validators.max(99999)]],
      desnivel: [null, [Validators.min(0), Validators.max(9999)]],
      dificultad: [''],
    });
  }

  /**
   * Carga la lista de provincias disponibles para el selector del formulario.
   */
  cargarProvincias(): void {
    this.miradorService.getProvincias().subscribe({
      next: (data) => this.provincias.set(data ?? []),
      error: (err) => {
        console.error('Error cargando provincias:', err);
        this.error = 'No se pudieron cargar las provincias';
      },
    });
  }

  /**
   * Carga los tags disponibles para el selector de etiquetas.
   */
  cargarTags(): void {
    this.miradorService.getTags().subscribe({
      next: (data) => this.tags.set(data ?? []),
      error: (err) => console.error('Error cargando tags:', err),
    });
  }

  /**
   * Obtiene la posición GPS del usuario y la aplica al formulario.
   */
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

  /**
   * Procesa las imágenes seleccionadas por el usuario.
   * Valida formato y tamaño, genera previsualización con FileReader
   * y limita el total a 5 imágenes.
   */
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

      // genera la previsualización leyendo el archivo como Data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagenesPreview = [...this.imagenesPreview, {
          url: e.target?.result as string,
          nombre: file.name,
          tamano: file.size,
        }];
        this.cdr.detectChanges(); // fuerza la detección de cambios porque está dentro de un callback asíncrono
      };
      reader.readAsDataURL(file);
    }

    input.value = ''; // limpia el input para permitir seleccionar el mismo archivo otra vez
  }

  /**
   * Elimina una imagen de la previsualización.
   * Si la imagen ya existe en el servidor (tiene fotoId), la elimina también del servidor.
   * Si es nueva (sin fotoId), solo la elimina del array local.
   */
  eliminarImagen(index: number): void {
    const preview = this.imagenesPreview[index];
    if (!preview) return;

    if (preview.fotoId) {
      // foto ya subida al servidor: elimina del servidor y luego del array local
      this.miradorService.deleteFoto(preview.fotoId).subscribe({
        next: () => {
          this.imagenesPreview = this.imagenesPreview.filter((_, i) => i !== index);
          this.cdr.detectChanges();
        },
        error: () => {
          this.imagenError = 'Error al eliminar la foto del servidor';
          this.cdr.detectChanges();
        }
      });
    } else {
      // foto nueva pendiente de subir: calcula su índice en imagenesSeleccionadas
      // contando solo las fotos sin fotoId que hay antes de este índice
      const fotosNuevasIndex = this.imagenesPreview
        .slice(0, index)
        .filter(p => !p.fotoId).length;
      this.imagenesSeleccionadas = this.imagenesSeleccionadas.filter((_, i) => i !== fotosNuevasIndex);
      this.imagenesPreview = this.imagenesPreview.filter((_, i) => i !== index);
      this.cdr.detectChanges();
    }
  }

  /**
   * Formatea el tamaño de un archivo en KB o MB para mostrarlo al usuario.
   */
  formatearTamano(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Añade o elimina un tag de la lista de seleccionados.
   */
  toggleTag(tagId: number): void {
    const idx = this.tagsSeleccionados.indexOf(tagId);
    if (idx > -1) {
      this.tagsSeleccionados.splice(idx, 1); // elimina si ya estaba seleccionado
    } else {
      this.tagsSeleccionados.push(tagId);    // añade si no estaba seleccionado
    }
  }

  isTagSeleccionado(tagId: number): boolean {
    return this.tagsSeleccionados.includes(tagId);
  }

  /**
   * Guarda el mirador (creación o edición) y ejecuta en paralelo con forkJoin
   * todas las acciones adicionales: crear/actualizar ruta, subir fotos y asignar tags.
   * Redirige al detalle del mirador tras completarse con éxito.
   */
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
    const hayDatosRuta = distancia && duracion && dificultad;

    let miradorIdFinal: number | null = null;

    // usa editar o crear según el contexto
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

          // creación: si hay datos de ruta, crea una ruta nueva asociada al mirador
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
                .pipe(catchError(() => of(null))), // catchError evita que un fallo en la ruta cancele todo
            );
          }

          // edición: si hay datos de ruta, actualiza la primera ruta existente del mirador
          if (hayDatosRuta && this.miradorIdEditando) {
            acciones.push(
              this.miradorService.getRutasPorMirador(miradorId).pipe(
                switchMap((rutas: any[]) => {
                  if (rutas.length > 0) {
                    const rutaPrincipal = rutas[0]; // usa la primera ruta como principal
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
                  return of(null); // no hay rutas que actualizar
                }),
                catchError((err) => {
                  console.error('Error actualizando ruta:', err);
                  return of(null);
                })
              )
            );
          }

          // sube cada imagen seleccionada como petición independiente
          if (this.imagenesSeleccionadas.length > 0) {
            for (const img of this.imagenesSeleccionadas) {
              acciones.push(
                this.miradorService.uploadFoto(miradorId, img).pipe(catchError(() => of(null))),
              );
            }
          }

          // asigna los tags seleccionados al mirador (reemplaza los anteriores)
          if (this.tagsSeleccionados.length > 0) {
            acciones.push(
              this.miradorService
                .asignarTags(miradorId, this.tagsSeleccionados)
                .pipe(catchError(() => of(null))),
            );
          }

          // forkJoin ejecuta todas las acciones en paralelo y espera a que todas completen
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
          // redirige al detalle del mirador tras 2 segundos para que el usuario vea el mensaje de éxito
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

  /**
   * Cancela la operación y navega al detalle del mirador si se estaba editando,
   * o al inicio si se estaba creando uno nuevo.
   */
  cancelar(): void {
    if (this.miradorIdEditando) {
      this.router.navigate(['/miradores', this.miradorIdEditando]);
    } else {
      this.router.navigate(['/home']);
    }
  }

  /**
   * Devuelve el mensaje de error de validación de un campo del formulario.
   * Solo muestra el error si el campo ha sido tocado por el usuario.
   */
  obtenerErrorCampo(campo: string): string {
    const control = this.form.get(campo);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      if (campo === 'provincia_id') {
        return 'Provincia es obligatoria'; // nombre más amigable para el campo de provincia
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

  /**
   * Capitaliza la primera letra de un texto.
   */
  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Abre el selector de ubicación en el mapa.
   * El setTimeout permite que el DOM se renderice antes de inicializar Leaflet.
   */
  abrirSelectorMapa(): void {
    this.mostrarMapaSelector.set(true);
    setTimeout(() => this.inicializarMapaSelector(), 100);
  }

  /**
   * Inicializa el mapa Leaflet del selector de ubicación centrado en España.
   * Al hacer click en el mapa, coloca un marcador y guarda la ubicación temporalmente.
   */
  private inicializarMapaSelector(): void {
    const container = document.getElementById('mapa-selector');
    if (!container || this.mapaSelector) return; // evita reinicializar si ya existe

    // centra el mapa en España con zoom 6
    this.mapaSelector = L.map('mapa-selector').setView([40.4637, -3.7492], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.mapaSelector);

    // al hacer click, guarda la ubicación temporalmente sin aplicarla aún al formulario
    this.mapaSelector.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat.toFixed(6); // 6 decimales para precisión GPS suficiente
      const lng = e.latlng.lng.toFixed(6);

      this.ubicacionSeleccionada = { lat, lng }; // guardado temporal, se aplica al aceptar

      // actualiza el marcador en el mapa eliminando el anterior si existía
      if (this.marcador) {
        this.mapaSelector?.removeLayer(this.marcador);
      }
      this.marcador = L.marker([parseFloat(lat), parseFloat(lng)])
        .addTo(this.mapaSelector!)
        .bindPopup(`<b>Ubicación seleccionada</b><br>Lat: ${lat}<br>Lng: ${lng}`)
        .openPopup();
    });
  }

  /**
   * Aplica la ubicación seleccionada en el mapa al formulario y cierra el selector.
   * Solo se aplica si el usuario ha hecho click en el mapa previamente.
   */
  aceptarUbicacion(): void {
    if (this.ubicacionSeleccionada) {
      this.form.patchValue({
        latitud: this.ubicacionSeleccionada.lat,
        longitud: this.ubicacionSeleccionada.lng,
      });
      this.ubicacionSeleccionada = null; // limpia la ubicación temporal tras aplicarla
    }
    this.cerrarSelectorMapa();
  }

  /**
   * Cierra el selector de mapa y destruye la instancia de Leaflet para liberar recursos.
   */
  cerrarSelectorMapa(): void {
    this.mostrarMapaSelector.set(false);
    this.ubicacionSeleccionada = null;
    if (this.mapaSelector) {
      this.mapaSelector.remove(); // destruye el mapa y libera los event listeners
      this.mapaSelector = null;
    }
  }
}
