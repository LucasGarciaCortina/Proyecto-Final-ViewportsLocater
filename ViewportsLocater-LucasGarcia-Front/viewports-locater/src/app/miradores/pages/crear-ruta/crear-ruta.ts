import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MiradorService } from '../../../services/mirador-service';

/**
 * Componente de creación y edición de rutas de senderismo.
 * Si se accede con un ID de ruta en la ruta Angular, carga la ruta para edición.
 * Si no, muestra el formulario vacío para crear una nueva ruta asociada al mirador.
 */
@Component({
  selector: 'app-crear-ruta',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './crear-ruta.html',
  styleUrls: ['./crear-ruta.css'],
})
export class CrearRutaComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private miradorService = inject(MiradorService);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);

  form!: FormGroup;
  miradorId!: number;                        // ID del mirador al que pertenece la ruta
  rutaIdEditando: number | null = null;      // null si es creación, número si es edición

  loading: boolean       = false;
  error: string | null   = null;
  success: string | null = null;

  gpxSeleccionado: File | null = null; // fichero GPX pendiente de subir
  gpxError: string | null      = null; // mensaje de error o aviso sobre el fichero GPX

  ngOnInit(): void {
    // obtiene el ID del mirador del snapshot de la ruta (no cambia durante la vida del componente)
    this.miradorId = Number(this.route.snapshot.paramMap.get('miradorId'));
    this.inicializarFormulario();

    this.route.params.subscribe(params => {
      const rutaId = params['id'];

      if (rutaId) {
        this.cargarRutaParaEditar(parseInt(rutaId));
      } else {
        // si no hay ID de ruta, resetea el formulario para modo creación
        this.rutaIdEditando  = null;
        this.gpxSeleccionado = null;
        this.gpxError        = null;
        this.form.reset();
      }
    });
  }

  /**
   * Carga los datos de una ruta existente y los precarga en el formulario para edición.
   * Si la ruta tiene un fichero GPX, muestra un aviso informativo.
   */
  private cargarRutaParaEditar(rutaId: number): void {
    this.miradorService.getRutaById(rutaId).subscribe({
      next: (res) => {
        const r = res.ruta;
        this.form.patchValue({
          nombre:                r.nombre,
          descripcion:           r.descripcion,
          distancia_km:          r.distancia_km,
          duracion_estimada_min: r.duracion_estimada_min,
          desnivel:              r.desnivel,
          dificultad:            r.dificultad ?? '',
        });

        // resetea el estado de validación para no mostrar errores antes de que el usuario interactúe
        this.form.markAsPristine();
        this.form.markAsUntouched();

        // informa al usuario de que ya existe un GPX y puede reemplazarlo
        if (r.gpx_url) {
          this.gpxError = '📎 Ya hay un archivo GPX. Puedes subir uno nuevo para reemplazarlo.';
        }

        this.rutaIdEditando = rutaId;
      },
      error: (err) => {
        this.error = 'No se pudo cargar la ruta para editar';
        console.error(err);
      }
    });
  }

  /**
   * Inicializa el formulario reactivo con sus validadores.
   * La descripción y el desnivel son opcionales.
   */
  inicializarFormulario(): void {
    this.form = this.fb.group({
      nombre:                ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      descripcion:           ['', [Validators.maxLength(500)]],
      distancia_km:          ['', [Validators.required, Validators.min(0.1), Validators.max(9999)]],  // máximo 9999 km
      duracion_estimada_min: [null, [Validators.required, Validators.min(1), Validators.max(99999)]], // máximo ~69 días
      desnivel:              ['', [Validators.min(0), Validators.max(9999)]],
      dificultad:            ['', Validators.required],
    });
  }

  /**
   * Valida y almacena el fichero GPX seleccionado por el usuario.
   * Solo acepta ficheros .gpx de hasta 10 MB.
   */
  onGpxChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    this.gpxError        = null;
    this.gpxSeleccionado = null;

    if (!file) return;

    // valida la extensión del fichero
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['gpx', 'xml'].includes(extension ?? '')) {
      this.gpxError = 'Solo se aceptan ficheros .gpx';
      input.value   = '';
      return;
    }

    // valida el tamaño máximo de 10 MB
    if (file.size > 10 * 1024 * 1024) {
      this.gpxError = 'El fichero no puede superar 10 MB';
      input.value   = '';
      return;
    }

    this.gpxSeleccionado = file;
  }

  /**
   * Elimina el fichero GPX seleccionado localmente sin afectar al servidor.
   */
  eliminarGpx(): void {
    this.gpxSeleccionado = null;
    this.gpxError        = null;
  }

  /**
   * Envía el formulario para crear o actualizar la ruta.
   * Redirige al detalle de la ruta o del mirador tras completarse con éxito.
   */
  enviar(): void {
    if (this.form.invalid) {
      this.error = 'Por favor, completa los campos obligatorios.';
      return;
    }

    this.loading = true;
    this.error   = null;

    const datosRuta = {
      nombre:                this.form.value.nombre.trim(),
      descripcion:           this.form.value.descripcion?.trim() || null,
      distancia_km:          this.form.value.distancia_km          ? parseFloat(this.form.value.distancia_km)          : null,
      duracion_estimada_min: this.form.value.duracion_estimada_min ? parseInt(this.form.value.duracion_estimada_min)   : null,
      desnivel:              this.form.value.desnivel               ? parseInt(this.form.value.desnivel)               : null,
      dificultad:            this.form.value.dificultad,
      mirador_id:            this.miradorId,
      gpx_file:              this.gpxSeleccionado, // null si no se seleccionó fichero GPX
    };

    // usa actualizar o crear según el contexto
    const request = this.rutaIdEditando
      ? this.miradorService.updateRuta(this.rutaIdEditando, datosRuta)
      : this.miradorService.crearRuta(datosRuta);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.success = this.rutaIdEditando
          ? '✓ Ruta actualizada correctamente'
          : '✓ Ruta creada correctamente';
        // redirige tras 1.5 segundos para que el usuario vea el mensaje de éxito
        setTimeout(() => {
          if (this.rutaIdEditando) {
            this.router.navigate(['/miradores', this.miradorId, 'rutas', this.rutaIdEditando]);
          } else {
            this.router.navigate(['/miradores', this.miradorId]);
          }
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.error?.message || 'Error al guardar la ruta.';
      },
    });
  }

  /**
   * Cancela la operación y navega al detalle de la ruta si se estaba editando,
   * o al detalle del mirador si se estaba creando una nueva ruta.
   */
  cancelar(): void {
    if (this.rutaIdEditando) {
      this.router.navigate(['/miradores', this.miradorId, 'rutas', this.rutaIdEditando]);
    } else {
      this.router.navigate(['/miradores', this.miradorId]);
    }
  }
}
