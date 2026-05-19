<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Valoracion extends Model
{
    protected $table = 'valoraciones';

    protected $fillable = [
        'user_id',
        'mirador_id',
        'puntuacion',
        'comentario',
    ];

    public function mirador()
    {
        return $this->belongsTo(Mirador::class, 'mirador_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
