import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MiradorService } from '../../../services/mirador-service';

@Component({
  selector: 'app-crear-ruta',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './crear-ruta.html',
  styleUrls: ['./crear-ruta.css'],
})
export class CrearRutaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private miradorService = inject(MiradorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  miradorId!: number;
  rutaIdEditando: number | null = null;

  loading = false;
  error: string | null = null;
  success: string | null = null;

  gpxSeleccionado: File | null = null;
  gpxError: string | null = null;

  ngOnInit(): void {
    this.miradorId = Number(this.route.snapshot.paramMap.get('miradorId'));
    this.inicializarFormulario();

    // Usar switchMap para limpiar suscripciones anteriores
    this.route.params.subscribe(params => {
      const rutaId = params['id'];

      if (rutaId) {
        this.cargarRutaParaEditar(parseInt(rutaId));
      } else {
        // Si no hay ID, resetear todo
        this.rutaIdEditando = null;
        this.gpxSeleccionado = null;
        this.gpxError = null;
        this.form.reset();
      }
    });
  }

  private cargarRutaParaEditar(rutaId: number): void {
    this.miradorService.getRutaById(rutaId).subscribe({
      next: (res) => {
        const r = res.ruta;
        this.form.patchValue({
          nombre: r.nombre,
          descripcion: r.descripcion,
          distancia_km: r.distancia_km,
          duracion_estimada_min: r.duracion_estimada_min,
          desnivel: r.desnivel,
          dificultad: r.dificultad ?? '',
        });

        // Resetear estado de validación para que no muestre errores sin interacción
        this.form.markAsPristine();
        this.form.markAsUntouched();

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

  inicializarFormulario(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      distancia_km: ['', [Validators.required, Validators.min(0.1)]],
      duracion_estimada_min: [null, [Validators.required, Validators.min(1)]],
      desnivel: [''],
      dificultad: ['', Validators.required],
    });
  }

  onGpxChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.gpxError = null;
    this.gpxSeleccionado = null;

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['gpx', 'xml'].includes(extension ?? '')) {
      this.gpxError = 'Solo se aceptan ficheros .gpx o .xml';
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.gpxError = 'El fichero no puede superar 10 MB';
      input.value = '';
      return;
    }

    this.gpxSeleccionado = file;
  }

  eliminarGpx(): void {
    this.gpxSeleccionado = null;
    this.gpxError = null;
  }

  enviar(): void {
    if (this.form.invalid) {
      this.error = 'Por favor, completa los campos obligatorios.';
      return;
    }

    this.loading = true;
    this.error = null;

    const datosRuta = {
      nombre: this.form.value.nombre.trim(),
      descripcion: this.form.value.descripcion?.trim() || null,
      distancia_km: this.form.value.distancia_km ? parseFloat(this.form.value.distancia_km) : null,
      duracion_estimada_min: this.form.value.duracion_estimada_min ? parseInt(this.form.value.duracion_estimada_min) : null,
      desnivel: this.form.value.desnivel ? parseInt(this.form.value.desnivel) : null,
      dificultad: this.form.value.dificultad,
      mirador_id: this.miradorId,
      gpx_file: this.gpxSeleccionado,
    };

    const request = this.rutaIdEditando
      ? this.miradorService.updateRuta(this.rutaIdEditando, datosRuta)
      : this.miradorService.crearRuta(datosRuta);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.success = this.rutaIdEditando
          ? '✓ Ruta actualizada correctamente'
          : '✓ Ruta creada correctamente';
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
        this.error = err.error?.message || 'Error al guardar la ruta.';
      },
    });
  }

  cancelar(): void {
    if (this.rutaIdEditando) {
      this.router.navigate(['/miradores', this.miradorId, 'rutas', this.rutaIdEditando]);
    } else {
      this.router.navigate(['/miradores', this.miradorId]);
    }
  }
}
