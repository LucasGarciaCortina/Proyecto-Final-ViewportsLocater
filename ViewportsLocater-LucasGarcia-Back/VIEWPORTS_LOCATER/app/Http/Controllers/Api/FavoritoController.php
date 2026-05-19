<?php

namespace App\Http\Controllers\Api;

use App\Models\Favorito;
use App\Models\Mirador;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class FavoritoController extends Controller
{
    // GET /api/favoritos - Listar favoritos del usuario
    public function index(Request $request)
    {
        $favoritos = $request->user()
            ->favoritos()
            ->with([
                'mirador.provincia',
                'mirador.fotos',
                'mirador.tags',
                'mirador.valoraciones'
            ])
            ->latest('favoritos.created_at')
            ->get();

        return response()->json($favoritos);
    }

    // POST /api/favoritos - Agregar a favoritos
    public function store(Request $request)
    {
        $validated = $request->validate([
            'mirador_id' => 'required|exists:miradores,id',
        ]);

        $favorito = Favorito::firstOrCreate([
            'user_id' => $request->user()->id,
            'mirador_id' => $validated['mirador_id'],
        ]);

        return response()->json([
            'message' => 'Mirador agregado a favoritos',
            'favorito' => $favorito,
        ], 201);
    }

    // DELETE /api/favoritos/{mirador_id} - Quitar de favoritos
    public function destroy(Request $request, $mirador_id)
    {
        Favorito::where('user_id', $request->user()->id)
            ->where('mirador_id', $mirador_id)
            ->delete();

        return response()->json(['message' => 'Mirador removido de favoritos']);
    }

    // GET /api/favoritos/check/{mirador_id} - Verificar si está en favoritos
    public function check(Request $request, $mirador_id)
    {
        $esFavorito = Favorito::where('user_id', $request->user()->id)
            ->where('mirador_id', $mirador_id)
            ->exists();

        return response()->json(['es_favorito' => $esFavorito]);
    }
}
