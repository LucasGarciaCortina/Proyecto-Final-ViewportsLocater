import { Component, inject, signal } from '@angular/core';
import { MiradorService } from '../../../services/mirador-service';
import { Provincia } from '../../../models/provincia.interface';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-formulario-crear',
  imports: [ReactiveFormsModule,FormsModule,CommonModule],
  templateUrl: './formulario-crear.html'
})
export class FormularioCrear {
  private miradorService = inject(MiradorService);
  mensaje = signal<string>('');
  provincias = signal<Provincia[]>([]);

  fb = inject(FormBuilder);
  formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    latitud: [0.0, Validators.required],
    longitud: [0.0, Validators.required],
    provincia_id: [1,Validators.required]
  })

  constructor() {
    this.miradorService.getProvincias().subscribe({
      next: (data) => this.provincias.set(data),
      error: (e) => this.mensaje.set('Error cargando provincias: ' + e.message),
    });
  }

  enviar()
  {
    if(this.formulario.invalid) return;

    const data = this.formulario.getRawValue();

    this.miradorService.crearMirador(data).subscribe({
      next: () =>{
        this.mensaje.set('Mirador guardado correctamente');
        this.miradorService.cargarMiradores();
      },
      error: (e) => this.mensaje.set('Error: '+ e.mensaje),
    });
  }
}
