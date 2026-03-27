import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MiradorService } from '../../../services/mirador-service';
import { MiradorDetalle } from '../../../models/mirador_detalle.interface';

@Component({
  selector: 'app-detalle-mirador',
  imports: [CommonModule],
  templateUrl: './detalle-mirador.html',
  styleUrls: ['./detalle-mirador.css']
})
export class DetalleMirador implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private miradorService = inject(MiradorService);

  detalle = signal<MiradorDetalle | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if(!id){
      this.error.set('ID de mirador no válido');
      this.cargando.set(false);
      return;
    }

    this.miradorService.getMiradorById(id).subscribe({
      next: (data) => {
        this.detalle.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudo cargar el mirador.');
        this.cargando.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/home']);
  }
}
