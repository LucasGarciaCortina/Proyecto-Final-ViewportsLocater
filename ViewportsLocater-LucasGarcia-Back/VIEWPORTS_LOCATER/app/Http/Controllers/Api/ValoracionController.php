<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mirador;
use App\Models\Valoracion;
use Illuminate\Http\Request;

class ValoracionController extends Controller
{
    public function index(Mirador $mirador)
    {
        $valoraciones = Valoracion::with('user:id,name')
            ->where('mirador_id', $mirador->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($valoraciones);
    }

    public function store(Request $request, Mirador $mirador)
    {
        $data = $request->validate([
            'puntuacion' => ['required', 'integer', 'min:1', 'max:5'],
            'comentario' => ['nullable', 'string', 'max:500'],
        ]);

        $valoracion = Valoracion::updateOrCreate(
            [
                'user_id'    => $request->user()->id,
                'mirador_id' => $mirador->id,
            ],
            [
                'puntuacion' => $data['puntuacion'],
                'comentario' => $data['comentario'] ?? null,
            ]
        );

        return response()->json($valoracion, 201);
    }

    public function getMedia(Mirador $mirador)
    {
        $result = Valoracion::where('mirador_id', $mirador->id)
            ->selectRaw('AVG(puntuacion) as media, COUNT(*) as total')
            ->first();

        return response()->json([
            'media' => $result->media ? round((float) $result->media, 2) : null,
            'total' => (int) $result->total,
        ]);
    }

    public function update($id, Request $request)
    {
        $valoracion = Valoracion::findOrFail($id);

        // Verificar que el usuario es propietario o admin
        if ($valoracion->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'No tienes permiso'], 403);
        }

        $validated = $request->validate([
            'puntuacion' => 'required|integer|between:1,5',
            'comentario' => 'nullable|string|max:500',
        ]);

        $valoracion->update($validated);

        return response()->json(['message' => 'Valoración actualizada correctamente', 'valoracion' => $valoracion]);
    }

    public function destroy($id, Request $request)
    {
        $valoracion = Valoracion::findOrFail($id);

        // Verificar que el usuario es propietario o admin
        if ($valoracion->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'No tienes permiso'], 403);
        }

        $valoracion->delete();

        return response()->json(['message' => 'Valoración eliminada correctamente']);
    }
}
