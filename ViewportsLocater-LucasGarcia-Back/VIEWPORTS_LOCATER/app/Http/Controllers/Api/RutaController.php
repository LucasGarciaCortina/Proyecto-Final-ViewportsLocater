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
            'distancia_km' => ['required', 'numeric', 'min:0.1'],
            'duracion_estimada_min' => ['required', 'integer', 'min:1'],
            'desnivel' => ['nullable', 'integer', 'min:0'],
            'dificultad' => ['nullable', 'string', 'max:30'],
            'enlace_maps' => ['nullable', 'string', 'max:500'],
            'gpx_url' => ['nullable', 'string', 'max:500'],
            'mirador_id' => ['required', 'integer', 'exists:miradores,id'],
            'gpx_file' => ['nullable', 'file', 'mimes:gpx,xml', 'max:10240'],
        ]);

        if ($request->hasFile('gpx_file')) {
            $path = $request->file('gpx_file')->store('gpx', 'public');
            $data['gpx_url'] = url('/storage/' . $path);
        }

        unset($data['gpx_file']);

        $ruta = Ruta::create(array_merge($data, [
            'user_id' => $request->user()->id,
        ]));

        return response()->json([
            'ruta' => $ruta,
            'mirador' => $ruta->mirador,
        ], 201);
    }

    public function show(Ruta $ruta)
    {
        $ruta->load('mirador');

        $mirador = $ruta->mirador;
        $clima = null;
        if ($mirador?->latitud && $mirador?->longitud) {
            $clima = app(\App\Services\WeatherService::class)->getWeather(
                (float) $mirador->latitud,
                (float) $mirador->longitud
            );
        }

        $miradorData = $mirador ? array_merge($mirador->toArray(), ['clima' => $clima]) : null;

        return response()->json([
            'ruta'    => array_merge($ruta->toArray(), ['mirador' => $miradorData]),
            'mirador' => $miradorData,
        ]);
    }

    public function update(Request $request, Ruta $ruta)
    {
        if (!$request->user()->hasRole('admin') && $ruta->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para editar esta ruta.'], 403);
        }

        $data = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'distancia_km' => ['nullable', 'numeric', 'min:0'],
            'duracion_estimada_min' => ['nullable', 'integer', 'min:0'],
            'desnivel' => ['nullable', 'integer', 'min:0'],
            'dificultad' => ['nullable', 'string', 'max:30'],
            'enlace_maps' => ['nullable', 'string', 'max:500'],
            'mirador_id' => ['sometimes', 'required', 'integer', 'exists:miradores,id'],
            'gpx_url' => ['nullable', 'string', 'max:500'],
            'gpx_file' => ['nullable', 'file', 'mimes:gpx,xml', 'max:10240'],
        ]);

        // Procesar GPX si viene
        if ($request->hasFile('gpx_file')) {
            // Borrar el archivo antiguo si existe
            if ($ruta->gpx_url) {
                // Funciona tanto si gpx_url es URL completa como ruta relativa
                $oldRelative = str_replace(url('/storage/'), '', $ruta->gpx_url);
                $oldPath = storage_path('app/public/' . $oldRelative);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }

            $path = $request->file('gpx_file')->store('gpx', 'public');
            // Guardar siempre como URL completa, igual que store()
            $data['gpx_url'] = url('/storage/' . $path);
        }

        $ruta->update($data);

        return response()->json([
            'message' => 'Ruta actualizada correctamente',
            'ruta' => $ruta->fresh(),
        ]);
    }

    public function destroy(Request $request, Ruta $ruta)
    {
        if (!$request->user()->hasRole('admin') && $ruta->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar esta ruta.'], 403);
        }

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

    public function descargarGpx(Ruta $ruta)
    {
        if (!$ruta->gpx_url) {
            return response()->json(['message' => 'No hay fichero GPX'], 404);
        }

        $path     = str_replace(url('/storage/'), '', $ruta->gpx_url);
        $fullPath = storage_path('app/public/' . $path);

        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'Fichero no encontrado'], 404);
        }

        return response()->download($fullPath, $ruta->nombre . '.gpx');
    }
}
