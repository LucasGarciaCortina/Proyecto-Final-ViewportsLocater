<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];
    
    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function miradores_creados()
    {
        return $this->hasMany(\App\Models\Mirador::class, 'user_id');
    }

    public function rutas()
    {
        return $this->hasMany(\App\Models\Ruta::class, 'user_id');
    }

    public function valoraciones()
    {
        return $this->hasMany(\App\Models\Valoracion::class, 'user_id');
    }

    public function fotos()
    {
        return $this->hasMany(\App\Models\Foto::class, 'user_id');
    }

    public function favoritos()
    {
        return $this->hasMany(Favorito::class, 'user_id');
    }
}
