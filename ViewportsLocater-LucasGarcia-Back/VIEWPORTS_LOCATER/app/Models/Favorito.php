<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Favorito extends Model
{
    protected $fillable = ['user_id', 'mirador_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function mirador()
    {
        return $this->belongsTo(Mirador::class);
    }
}
