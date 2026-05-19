<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Foto extends Model
{
    protected $table = 'fotos';
    use HasFactory;

    protected $fillable = [
        'url',
        'mirador_id',
        'user_id',
    ];

    public function mirador()
    {
        return $this->belongsTo(Mirador::class);
    }
}
