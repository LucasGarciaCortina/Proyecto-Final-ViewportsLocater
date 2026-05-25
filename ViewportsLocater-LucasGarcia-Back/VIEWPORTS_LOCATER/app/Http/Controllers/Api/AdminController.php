<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Foto;
use App\Models\Mirador;
use App\Models\Ruta;
use App\Models\User;
use App\Models\Valoracion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Controlador de administración.
 * Gestiona las operaciones exclusivas del panel de administrador:
 * estadísticas globales, gestión de usuarios, miradores y rutas.
 */
class AdminController extends Controller
{
    /**
     * ID del usuario administrador del sistema.
     * Este usuario está protegido y no puede ser eliminado ni modificado.
     */
    private const ADMIN_SYSTEM_ID = 4;

    // ── Estadísticas globales ──────────────────────────────────────

    /**
     * Devuelve estadísticas globales de la plataforma en formato JSON.
     * Incluye conteos de miradores, usuarios, rutas, valoraciones y fotos,
     * así como el número de miradores creados por mes en el año actual.
     */
    public function estadisticas()
    {
        return response()->json([
            'total_miradores'    => Mirador::count(),
            'total_usuarios'     => User::count(),
            'total_rutas'        => Ruta::count(),
            'total_valoraciones' => Valoracion::count(),
            'total_fotos'        => Foto::count(),
            'miradores_por_mes'  => Mirador::selectRaw('MONTH(created_at) as mes, COUNT(*) as total')
                ->whereYear('created_at', now()->year)
                ->groupBy('mes')
                ->orderBy('mes')
                ->get(),
        ]);
    }

    // ── Gestión de usuarios ────────────────────────────────────────

    /**
     * Devuelve la lista completa de usuarios con sus roles,
     * ordenados por fecha de creación descendente.
     */
    public function usuarios()
    {
        return response()->json(
            User::with('roles')->orderBy('created_at', 'desc')->get()
        );
    }

    /**
     * Elimina un usuario del sistema.
     * Protege al administrador del sistema y no permite que un admin se elimine a sí mismo.
     *
     * @param User $user Usuario a eliminar (inyectado por route model binding)
     */
    public function destroyUsuario(User $user)
    {
        // NO PERMITIR BORRAR AL ADMIN DEL SISTEMA
        if ($user->id === self::ADMIN_SYSTEM_ID) {
            return response()->json(
                ['message' => 'No se puede eliminar al usuario administrador del sistema'],
                403
            );
        }

        // NO PERMITIR BORRARSE A SÍ MISMO
        if (Auth::id() === $user->id) {
            return response()->json(
                ['message' => 'No puedes eliminarte a ti mismo'],
                403
            );
        }

        $user->delete();
        return response()->json(['message' => 'Usuario eliminado correctamente.']);
    }

    /**
     * Asigna un rol ('user' o 'admin') a un usuario.
     * Protege al administrador del sistema y evita que un admin se quite su propio rol.
     *
     * @param Request $request Petición con el campo 'role'
     * @param User $user Usuario al que se le asigna el rol (inyectado por route model binding)
     */
    public function asignarRol(Request $request, User $user)
    {
        $request->validate([
            'role' => ['required', 'in:user,admin'],
        ]);

        // NO PERMITIR CAMBIAR EL ROL DEL ADMIN DEL SISTEMA
        if ($user->id === self::ADMIN_SYSTEM_ID) {
            return response()->json(
                ['message' => 'No se puede cambiar el rol del usuario administrador del sistema'],
                403
            );
        }

        // NO PERMITIR QUITARSE EL ROL A SÍ MISMO
        if (Auth::id() === $user->id && $request->role !== 'admin') {
            return response()->json(
                ['message' => 'No puedes quitarte a ti mismo el rol de administrador'],
                403
            );
        }

        $user->syncRoles([$request->role]);

        return response()->json(['message' => 'Rol actualizado correctamente.']);
    }

    // ── Gestión de miradores ───────────────────────────────────────

    /**
     * Devuelve la lista completa de miradores con sus relaciones
     * (provincia, usuario creador y valoraciones), ordenados por fecha de creación descendente.
     */
    public function miradores()
    {
        return Mirador::with('provincia', 'user', 'valoraciones')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Elimina un mirador del sistema.
     *
     * @param Mirador $mirador Mirador a eliminar (inyectado por route model binding)
     */
    public function destroyMirador(Mirador $mirador)
    {
        $mirador->delete();
        return response()->json(['message' => 'Mirador eliminado correctamente.']);
    }

    // ── Gestión de rutas ───────────────────────────────────────

    /**
     * Devuelve la lista completa de rutas con el nombre del mirador asociado
     * y el usuario creador, ordenadas por fecha de creación descendente.
     */
    public function rutas()
    {
        return response()->json(
            Ruta::with(['mirador:id,nombre', 'user:id,name'])
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    /**
     * Elimina una ruta del sistema.
     *
     * @param Ruta $ruta Ruta a eliminar (inyectado por route model binding)
     */
    public function destroyRuta(Ruta $ruta)
    {
        $ruta->delete();
        return response()->json(['message' => 'Ruta eliminada correctamente.']);
    }
}
