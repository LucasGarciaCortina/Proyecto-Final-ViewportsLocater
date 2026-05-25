<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * Modelo User.
 * Representa a un usuario del sistema. Extiende Authenticatable para gestionar
 * la autenticación, e incorpora tokens de Sanctum y roles de Spatie.
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, // permite generar tokens de acceso personal (Sanctum)
        HasFactory,
        Notifiable,
        HasRoles;     // añade el sistema de roles y permisos de Spatie

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
     * Evita que la contraseña y el token de sesión se expongan en respuestas JSON.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     * 'hashed' hace que Laravel hashee automáticamente la contraseña al asignarla.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    /**
     * Miradores creados por el usuario.
     * Se especifica la clave foránea explícitamente para mayor claridad.
     */
    public function miradores_creados()
    {
        return $this->hasMany(\App\Models\Mirador::class, 'user_id');
    }

    /**
     * Rutas de senderismo creadas por el usuario.
     */
    public function rutas()
    {
        return $this->hasMany(\App\Models\Ruta::class, 'user_id');
    }

    /**
     * Valoraciones realizadas por el usuario sobre miradores.
     */
    public function valoraciones()
    {
        return $this->hasMany(\App\Models\Valoracion::class, 'user_id');
    }

    /**
     * Fotos subidas por el usuario.
     */
    public function fotos()
    {
        return $this->hasMany(\App\Models\Foto::class, 'user_id');
    }

    /**
     * Miradores marcados como favoritos por el usuario.
     */
    public function favoritos()
    {
        return $this->hasMany(Favorito::class, 'user_id');
    }
}
