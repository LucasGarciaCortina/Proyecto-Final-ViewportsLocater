<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mirador;
use App\Models\Ruta;
use Illuminate\Http\Request;

class RutaController extends Controller
{
    public function index()
    {
        return Ruta::orderBy('id', 'desc')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'distancia_km' => ['nullable', 'numeric', 'min:0'],
            'duracion_estimada_min' => ['nullable', 'integer', 'min:0'],
            'dificultad' => ['nullable', 'string', 'max:30'],
            'enlace_maps' => ['nullable', 'string', 'max:500'],
            'gpx_url' => ['nullable', 'string', 'max:500'],
            'mirador_id' => ['required', 'integer', 'exists:miradores,id'],
        ]);

        $ruta = Ruta::create($data);

        return response()->json([
            'ruta' => $ruta,
            'mirador' => $ruta->mirador,
        ], 201);
    }

    public function show(Ruta $ruta)
    {
        return response()->json([
            'ruta' => $ruta,
            'mirador' => $ruta->mirador,
        ]);
    }

    public function update(Request $request, Ruta $ruta)
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'distancia_km' => ['nullable', 'numeric', 'min:0'],
            'duracion_estimada_min' => ['nullable', 'integer', 'min:0'],
            'dificultad' => ['nullable', 'string', 'max:30'],
            'enlace_maps' => ['nullable', 'string', 'max:500'],
            'gpx_url' => ['nullable', 'string', 'max:500'],
            'mirador_id' => ['sometimes', 'required', 'integer', 'exists:miradores,id'],
        ]);

        $ruta->update($data);

        return response()->json([
            'ruta' => $ruta,
            'mirador' => $ruta->mirador,
        ]);
    }

    public function destroy(Ruta $ruta)
    {
        $ruta->delete();
         return response()->json([
            'message' => 'Ruta eliminada correctamente'
        ]);
    }

    public function RutaPorMirador(Mirador $mirador)
    {
        return Ruta::where('mirador_id', $mirador->id)
            ->orderBy('id', 'desc')
            ->get();
    }
}
