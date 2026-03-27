<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Provincia extends Model
{
    protected $table = 'provincias';
    use HasFactory;

    protected $fillable = [
        'nombre',
    ];

    public function miradores()
    {
        return $this->hasMany(Mirador::class);
    }
}
