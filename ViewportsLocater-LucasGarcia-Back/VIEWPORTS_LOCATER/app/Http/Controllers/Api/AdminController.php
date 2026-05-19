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

class AdminController extends Controller
{
    private const ADMIN_SYSTEM_ID = 4;

    // ── Estadísticas globales ──────────────────────────────────────
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
    public function usuarios()
    {
        return response()->json(
            User::with('roles')->orderBy('created_at', 'desc')->get()
        );
    }

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
    public function miradores()
    {
        return Mirador::with('provincia', 'user', 'valoraciones')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function destroyMirador(Mirador $mirador)
    {
        $mirador->delete();
        return response()->json(['message' => 'Mirador eliminado correctamente.']);
    }

    // ── Gestión de rutas ───────────────────────────────────────
    public function rutas()
    {
        return response()->json(
            Ruta::with(['mirador:id,nombre', 'user:id,name'])
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function destroyRuta(Ruta $ruta)
    {
        $ruta->delete();
        return response()->json(['message' => 'Ruta eliminada correctamente.']);
    }
}
