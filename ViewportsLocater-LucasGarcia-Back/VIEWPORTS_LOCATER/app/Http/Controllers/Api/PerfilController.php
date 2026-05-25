<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Controlador de perfil.
 * Gestiona la información del usuario autenticado: datos personales,
 * estadísticas de actividad y listados de su contenido creado.
 */
class PerfilController extends Controller
{
    /**
     * Devuelve los datos del usuario autenticado junto con sus roles.
     */
    public function index(Request $request)
    {
        $user = $request->user()->load('roles'); // carga los roles en la misma consulta para evitar una query adicional

        return response()->json([
            'user'  => $user,
            'roles' => $user->getRoleNames(), // devuelve los nombres de los roles como array de strings
        ]);
    }

    /**
     * Devuelve un resumen numérico de la actividad del usuario autenticado:
     * miradores creados, rutas, valoraciones y fotos subidas.
     */
    public function estadisticas(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'miradores'    => $user->miradores_creados()->count(),
            'rutas'        => $user->rutas()->count(),
            'valoraciones' => $user->valoraciones()->count(),
            'fotos'        => $user->fotos()->count(),
        ]);
    }

    /**
     * Devuelve los miradores creados por el usuario autenticado,
     * con sus relaciones básicas y la valoración media, ordenados por fecha descendente.
     */
    public function miradores(Request $request)
    {
        $miradores = $request->user()
            ->miradores_creados()
            ->with(['tags:id,nombre', 'fotos:id,url,mirador_id', 'provincia:id,nombre'])
            ->withAvg('valoraciones', 'puntuacion') // calcula la media de puntuaciones directamente en SQL
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($miradores);
    }

    /**
     * Devuelve las rutas creadas por el usuario autenticado,
     * incluyendo el nombre del mirador al que pertenecen.
     */
    public function rutas(Request $request)
    {
        $rutas = $request->user()
            ->rutas()
            ->with(['mirador:id,nombre']) // carga solo id y nombre del mirador para no sobrecargar la respuesta
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($rutas);
    }

    /**
     * Devuelve las valoraciones realizadas por el usuario autenticado,
     * incluyendo el nombre del mirador valorado.
     */
    public function valoraciones(Request $request)
    {
        $valoraciones = $request->user()
            ->valoraciones()
            ->with(['mirador:id,nombre']) // carga solo id y nombre del mirador para no sobrecargar la respuesta
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($valoraciones);
    }
}
