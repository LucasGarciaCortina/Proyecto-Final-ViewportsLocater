<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo Ruta.
 * Representa una ruta de senderismo asociada a un mirador,
 * con información de distancia, desnivel, dificultad y fichero GPX opcional.
 */
class Ruta extends Model
{
    use HasFactory;

    protected $table = 'rutas';

    /**
     * Campos que pueden asignarse de forma masiva.
     */
    protected $fillable = [
        'nombre',
        'descripcion',
        'distancia_km',
        'desnivel',
        'duracion_estimada_min',
        'dificultad',
        'enlace_maps',
        'gpx_url',   // URL pública del fichero GPX almacenado en el servidor
        'mirador_id',
        'user_id',
    ];

    /**
     * Conversión de tipos automática al acceder a los atributos del modelo.
     * Garantiza que desnivel siempre se devuelva como entero.
     */
    protected $casts = [
        'desnivel' => 'integer',
    ];

    /**
     * Mirador al que pertenece la ruta.
     */
    public function mirador()
    {
        return $this->belongsTo(Mirador::class);
    }

    /**
     * Usuario creador de la ruta.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
