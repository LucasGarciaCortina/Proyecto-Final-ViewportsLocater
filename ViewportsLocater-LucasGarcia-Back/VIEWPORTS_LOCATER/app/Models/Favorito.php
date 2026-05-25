<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modelo Favorito.
 * Representa la relación entre un usuario y un mirador marcado como favorito.
 * Actúa como tabla pivote explícita entre usuarios y miradores.
 */
class Favorito extends Model
{
    /**
     * Campos que pueden asignarse de forma masiva.
     */
    protected $fillable = ['user_id', 'mirador_id'];

    /**
     * Usuario propietario del favorito.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Mirador asociado al favorito.
     */
    public function mirador()
    {
        return $this->belongsTo(Mirador::class);
    }
}
