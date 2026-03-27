<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ruta extends Model
{
    protected $table = 'rutas';
    use HasFactory;

    protected $fillable = [
        'nombre',
        'descripcion',
        'distancia_km',
        'duracion_estimada_min',
        'dificultad',
        'enlace_maps',
        'gpx_url',
        'mirador_id',
    ];

    public function mirador()
    {
        return $this->belongsTo(Mirador::class);
    }

}
