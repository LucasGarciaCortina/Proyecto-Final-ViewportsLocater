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
        'desnivel',
        'duracion_estimada_min',
        'dificultad',
        'enlace_maps',
        'gpx_url',
        'mirador_id',
        'user_id',
    ];

    protected $casts = [
        'desnivel' => 'integer',
    ];

    public function mirador()
    {
        return $this->belongsTo(Mirador::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
