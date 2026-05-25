<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo Provincia.
 * Representa una provincia geográfica a la que pueden pertenecer los miradores.
 */
class Provincia extends Model
{
    use HasFactory;

    protected $table = 'provincias';

    /**
     * Campos que pueden asignarse de forma masiva.
     */
    protected $fillable = [
        'nombre',
    ];

    /**
     * Miradores pertenecientes a esta provincia.
     */
    public function miradores()
    {
        return $this->hasMany(Mirador::class);
    }
}
