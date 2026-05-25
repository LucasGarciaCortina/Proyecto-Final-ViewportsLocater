<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo Foto.
 * Representa una fotografía subida por un usuario y asociada a un mirador.
 */
class Foto extends Model
{
    use HasFactory;

    protected $table = 'fotos';

    /**
     * Campos que pueden asignarse de forma masiva.
     */
    protected $fillable = [
        'url',
        'mirador_id',
        'user_id',
    ];

    /**
     * Mirador al que pertenece la foto.
     */
    public function mirador()
    {
        return $this->belongsTo(Mirador::class);
    }
}
