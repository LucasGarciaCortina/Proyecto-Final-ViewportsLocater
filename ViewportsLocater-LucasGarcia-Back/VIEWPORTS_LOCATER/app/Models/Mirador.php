<?php

namespace App\Models;

use App\Services\WeatherService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo Mirador.
 * Representa un punto panorámico con sus coordenadas GPS, provincia,
 * rutas de acceso, fotos, tags y valoraciones de la comunidad.
 */
class Mirador extends Model
{
    use HasFactory;

    protected $table = 'miradores';

    /**
     * Campos que pueden asignarse de forma masiva.
     */
    protected $fillable = [
        'nombre',
        'descripcion',
        'latitud',
        'longitud',
        'provincia_id',
        'user_id',
    ];

    /**
     * Provincia a la que pertenece el mirador.
     * La clave foránea se especifica explícitamente aunque coincida con la convención,
     * para mayor claridad.
     */
    public function provincia()
    {
        return $this->belongsTo(Provincia::class, 'provincia_id');
    }

    /**
     * Rutas de senderismo asociadas al mirador.
     */
    public function rutas()
    {
        return $this->hasMany(Ruta::class, 'mirador_id');
    }

    /**
     * Fotos asociadas al mirador.
     */
    public function fotos()
    {
        return $this->hasMany(Foto::class, 'mirador_id');
    }

    /**
     * Tags asociados al mirador a través de la tabla pivote mirador_tag.
     */
    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'mirador_tag', 'mirador_id', 'tag_id');
    }

    /**
     * Usuarios que han valorado el mirador, accesibles a través de la tabla valoraciones.
     * Incluye los campos puntuacion y comentario de la tabla pivote.
     */
    public function usuarios_valoraciones()
    {
        return $this->belongsToMany(User::class, 'valoraciones', 'mirador_id', 'user_id')
            ->withPivot('puntuacion', 'comentario') // expone los campos de la tabla pivote en el resultado
            ->withTimestamps();
    }

    /**
     * Valoraciones directas del mirador como modelo independiente.
     * Se usa cuando se necesita trabajar con el modelo Valoracion completo
     * en lugar de acceder a través de la relación many-to-many de usuarios.
     */
    public function valoraciones()
    {
        return $this->hasMany(\App\Models\Valoracion::class, 'mirador_id');
    }

    /**
     * Usuario creador del mirador.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
