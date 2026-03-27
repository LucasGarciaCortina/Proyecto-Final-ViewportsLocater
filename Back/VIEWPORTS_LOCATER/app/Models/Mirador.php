<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mirador extends Model
{
    use HasFactory;

    protected $table = 'miradores';

    protected $fillable = [
        'nombre',
        'descripcion',
        'latitud',
        'longitud',
        'provincia_id',
    ];

    public function provincia()
    {
        return $this->belongsTo(Provincia::class, 'provincia_id');
    }

    public function rutas()
    {
        return $this->hasMany(Ruta::class, 'mirador_id');
    }

    public function fotos()
    {
        return $this->hasMany(Foto::class, 'mirador_id');
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'mirador_tag', 'mirador_id', 'tag_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'valoraciones', 'mirador_id', 'user_id')
            ->withPivot('puntuacion', 'comentario')
            ->withTimestamps();
    }
}
