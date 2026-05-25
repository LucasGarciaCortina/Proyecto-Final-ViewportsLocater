<?php

namespace App\Http\Controllers\Api;

use App\Models\Favorito;
use App\Models\Mirador;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * Controlador de favoritos.
 * Gestiona las operaciones de añadir, listar, eliminar y comprobar
 * los miradores marcados como favoritos por el usuario autenticado.
 */
class FavoritoController extends Controller
{
    // GET /api/favoritos - Listar favoritos del usuario
    /**
     * Devuelve todos los miradores marcados como favoritos por el usuario autenticado,
     * con sus relaciones cargadas y la valoración media calculada manualmente.
     */
    public function index(Request $request)
    {
        $favoritos = $request->user()
            ->favoritos()
            ->with([
                'mirador.provincia',
                'mirador.fotos',
                'mirador.tags',
                'mirador.rutas',
                'mirador.valoraciones',
            ])
            ->latest('favoritos.created_at') // ordena por fecha de añadido a favoritos, no por fecha del mirador
            ->get()
            ->map(function ($favorito) {
                // calcula la valoración media manualmente sobre la colección ya cargada,
                // evitando así una consulta adicional a la base de datos por cada mirador
                if ($favorito->mirador) {
                    $valoraciones = $favorito->mirador->valoraciones;
                    $favorito->mirador->valoraciones_avg_puntuacion = $valoraciones->count() > 0
                        ? round($valoraciones->avg('puntuacion'), 1) // redondea a 1 decimal
                        : null; // null si el mirador no tiene valoraciones
                }
                return $favorito;
            });

        return response()->json($favoritos);
    }

    // POST /api/favoritos - Agregar a favoritos
    /**
     * Añade un mirador a la lista de favoritos del usuario autenticado.
     * Si ya existe el favorito, no lo duplica (firstOrCreate).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'mirador_id' => 'required|exists:miradores,id', // verifica que el mirador existe en la BD
        ]);

        // firstOrCreate evita duplicados: busca el registro y solo lo crea si no existe
        $favorito = Favorito::firstOrCreate([
            'user_id'    => $request->user()->id,
            'mirador_id' => $validated['mirador_id'],
        ]);

        return response()->json([
            'message'  => 'Mirador agregado a favoritos',
            'favorito' => $favorito,
        ], 201); // 201 Created
    }

    // DELETE /api/favoritos/{mirador_id} - Quitar de favoritos
    /**
     * Elimina un mirador de la lista de favoritos del usuario autenticado.
     * Filtra por usuario y mirador para garantizar que cada usuario
     * solo puede eliminar sus propios favoritos.
     */
    public function destroy(Request $request, $mirador_id)
    {
        Favorito::where('user_id', $request->user()->id)
            ->where('mirador_id', $mirador_id)
            ->delete();

        return response()->json(['message' => 'Mirador removido de favoritos']);
    }

    // GET /api/favoritos/check/{mirador_id} - Verificar si está en favoritos
    /**
     * Comprueba si un mirador concreto está en los favoritos del usuario autenticado.
     * Usa exists() en lugar de get() para mayor eficiencia, ya que solo necesita saber si existe.
     */
    public function check(Request $request, $mirador_id)
    {
        $esFavorito = Favorito::where('user_id', $request->user()->id)
            ->where('mirador_id', $mirador_id)
            ->exists(); // devuelve true/false sin cargar el registro completo

        return response()->json(['es_favorito' => $esFavorito]);
    }
}
