<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modelo Valoracion.
 * Representa la puntuación y comentario que un usuario registrado
 * realiza sobre un mirador. Cada usuario solo puede tener una valoración
 * por mirador (gestionado mediante updateOrCreate en el controlador).
 */
class Valoracion extends Model
{
    protected $table = 'valoraciones';

    /**
     * Campos que pueden asignarse de forma masiva.
     */
    protected $fillable = [
        'user_id',
        'mirador_id',
        'puntuacion', // valor entero entre 1 y 5
        'comentario',
    ];

    /**
     * Mirador que ha sido valorado.
     * La clave foránea se especifica explícitamente aunque coincida con la convención.
     */
    public function mirador()
    {
        return $this->belongsTo(Mirador::class, 'mirador_id');
    }

    /**
     * Usuario que realizó la valoración.
     * La clave foránea se especifica explícitamente aunque coincida con la convención.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
