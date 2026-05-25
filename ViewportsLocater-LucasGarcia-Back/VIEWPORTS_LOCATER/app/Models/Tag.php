<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo Tag.
 * Representa una etiqueta que puede asociarse a uno o varios miradores
 * para facilitar el filtrado y la búsqueda.
 */
class Tag extends Model
{
    use HasFactory;

    protected $table = "tags";

    /**
     * Campos que pueden asignarse de forma masiva.
     */
    protected $fillable = [
        'nombre',
    ];

    /**
     * Miradores que tienen asignada esta etiqueta.
     * La tabla pivote se infiere automáticamente como 'mirador_tag' por convención de Laravel.
     */
    public function miradores()
    {
        return $this->belongsToMany(Mirador::class);
    }
}
