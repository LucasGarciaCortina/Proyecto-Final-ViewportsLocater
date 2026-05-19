<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PerfilController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user()->load('roles');

        return response()->json([
            'user' => $user,
            'roles' => $user->getRoleNames(),
        ]);
    }

    public function estadisticas(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'miradores'   => $user->miradores_creados()->count(),
            'rutas'       => $user->rutas()->count(),
            'valoraciones'=> $user->valoraciones()->count(),
            'fotos'       => $user->fotos()->count(),
        ]);
    }

    public function miradores(Request $request)
    {
        $miradores = $request->user()
            ->miradores_creados()
            ->with(['tags:id,nombre', 'fotos:id,url,mirador_id', 'provincia:id,nombre'])
            ->withAvg('valoraciones', 'puntuacion')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($miradores);
    }

    public function rutas(Request $request)
    {
        $rutas = $request->user()
            ->rutas()
            ->with(['mirador:id,nombre'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($rutas);
    }

    public function valoraciones(Request $request)
    {
        $valoraciones = $request->user()
            ->valoraciones()
            ->with(['mirador:id,nombre'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($valoraciones);
    }
}
