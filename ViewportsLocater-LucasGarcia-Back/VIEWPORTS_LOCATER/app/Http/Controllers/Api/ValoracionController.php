<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mirador;
use App\Models\Valoracion;
use Illuminate\Http\Request;

/**
 * Controlador de valoraciones.
 * Gestiona las operaciones CRUD sobre las valoraciones que los usuarios
 * pueden hacer sobre los miradores, así como el cálculo de la media.
 */
class ValoracionController extends Controller
{
    /**
     * Devuelve todas las valoraciones de un mirador concreto,
     * incluyendo el nombre del usuario que las realizó, ordenadas por fecha descendente.
     */
    public function index(Mirador $mirador)
    {
        $valoraciones = Valoracion::with('user:id,name') // carga solo id y nombre del usuario para no exponer datos sensibles
            ->where('mirador_id', $mirador->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($valoraciones);
    }

    /**
     * Crea o actualiza la valoración del usuario autenticado sobre un mirador.
     * Un usuario solo puede tener una valoración por mirador (updateOrCreate lo garantiza).
     */
    public function store(Request $request, Mirador $mirador)
    {
        $data = $request->validate([
            'puntuacion' => ['required', 'integer', 'min:1', 'max:5'],
            'comentario' => ['nullable', 'string', 'max:500'],
        ]);

        // updateOrCreate busca por user_id + mirador_id; si existe la actualiza, si no la crea
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

    /**
     * Devuelve la puntuación media y el total de valoraciones de un mirador.
     * Usa una consulta SQL agregada para calcular ambos valores en una sola query.
     */
    public function getMedia(Mirador $mirador)
    {
        $result = Valoracion::where('mirador_id', $mirador->id)
            ->selectRaw('AVG(puntuacion) as media, COUNT(*) as total') // calcula media y total directamente en SQL
            ->first();

        return response()->json([
            'media' => $result->media ? round((float) $result->media, 2) : null, // null si no hay valoraciones
            'total' => (int) $result->total,
        ]);
    }

    /**
     * Actualiza una valoración existente.
     * Solo puede editarla el propietario o un administrador.
     */
    public function update($id, Request $request)
    {
        $valoracion = Valoracion::findOrFail($id); // lanza 404 automáticamente si no existe

        // comprueba que el usuario es el propietario de la valoración o un admin
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

    /**
     * Elimina una valoración del sistema.
     * Solo puede eliminarla el propietario o un administrador.
     */
    public function destroy($id, Request $request)
    {
        $valoracion = Valoracion::findOrFail($id); // lanza 404 automáticamente si no existe

        // comprueba que el usuario es el propietario de la valoración o un admin
        if ($valoracion->user_id !== $request->user()->id && !$request->user()->hasRole('admin')) {
            return response()->json(['message' => 'No tienes permiso'], 403);
        }

        $valoracion->delete();

        return response()->json(['message' => 'Valoración eliminada correctamente']);
    }
}
