<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mirador;
use App\Models\Ruta;
use Illuminate\Http\Request;

/**
 * Controlador de rutas de senderismo.
 * Gestiona las operaciones CRUD sobre rutas asociadas a miradores,
 * incluyendo la subida, actualización y descarga de ficheros GPX.
 */
class RutaController extends Controller
{
    /**
     * Devuelve todas las rutas ordenadas por ID descendente.
     */
    public function index()
    {
        return Ruta::orderBy('id', 'desc')->get();
    }

    /**
     * Crea una nueva ruta asociada a un mirador.
     * Si se adjunta un fichero GPX, lo almacena y guarda su URL pública.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'               => ['required', 'string', 'max:150'],
            'descripcion'          => ['nullable', 'string'],
            'distancia_km'         => ['required', 'numeric', 'min:0.1'],
            'duracion_estimada_min' => ['required', 'integer', 'min:1'],
            'desnivel'             => ['nullable', 'integer', 'min:0'],
            'dificultad'           => ['nullable', 'string', 'max:30'],
            'enlace_maps'          => ['nullable', 'string', 'max:500'],
            'gpx_url'              => ['nullable', 'string', 'max:500'],
            'mirador_id'           => ['required', 'integer', 'exists:miradores,id'],
            'gpx_file'             => ['nullable', 'file', 'mimes:gpx,xml', 'max:10240'], // máximo 10 MB, acepta .gpx y .xml
        ]);

        if ($request->hasFile('gpx_file')) {
            // almacena el fichero en storage/app/public/gpx y genera la URL pública
            $path = $request->file('gpx_file')->store('gpx', 'public');
            $data['gpx_url'] = url('/storage/' . $path);
        }

        unset($data['gpx_file']); // elimina gpx_file del array antes de crear el registro, ya que no es un campo de la tabla

        $ruta = Ruta::create(array_merge($data, [
            'user_id' => $request->user()->id,
        ]));

        return response()->json([
            'ruta'    => $ruta,
            'mirador' => $ruta->mirador,
        ], 201); // 201 Created
    }

    /**
     * Devuelve el detalle completo de una ruta, incluyendo el mirador asociado
     * y los datos meteorológicos actuales en sus coordenadas si están disponibles.
     */
    public function show(Ruta $ruta)
    {
        $ruta->load('mirador');

        $mirador = $ruta->mirador;
        $clima   = null;

        // solo consulta el clima si el mirador tiene coordenadas definidas
        if ($mirador?->latitud && $mirador?->longitud) {
            $clima = app(\App\Services\WeatherService::class)->getWeather(
                (float) $mirador->latitud,
                (float) $mirador->longitud
            );
        }

        // fusiona los datos del mirador con el clima en un único objeto; null si no hay mirador
        $miradorData = $mirador ? array_merge($mirador->toArray(), ['clima' => $clima]) : null;

        return response()->json([
            'ruta'    => array_merge($ruta->toArray(), ['mirador' => $miradorData]), // incluye el mirador dentro del objeto ruta
            'mirador' => $miradorData,
        ]);
    }

    /**
     * Actualiza los datos de una ruta.
     * Si se sube un nuevo fichero GPX, elimina el anterior y almacena el nuevo.
     * Solo puede editarla el propietario o un administrador.
     */
    public function update(Request $request, Ruta $ruta)
    {
        // comprueba que el usuario es admin o es el creador de la ruta
        if (!$request->user()->hasRole('admin') && $ruta->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para editar esta ruta.'], 403);
        }

        $data = $request->validate([
            'nombre'               => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion'          => ['nullable', 'string'],
            'distancia_km'         => ['nullable', 'numeric', 'min:0'],
            'duracion_estimada_min' => ['nullable', 'integer', 'min:0'],
            'desnivel'             => ['nullable', 'integer', 'min:0'],
            'dificultad'           => ['nullable', 'string', 'max:30'],
            'enlace_maps'          => ['nullable', 'string', 'max:500'],
            'mirador_id'           => ['sometimes', 'required', 'integer', 'exists:miradores,id'],
            'gpx_url'              => ['nullable', 'string', 'max:500'],
            'gpx_file'             => ['nullable', 'file', 'mimes:gpx,xml', 'max:10240'],
        ]);

        if ($request->hasFile('gpx_file')) {
            // elimina el fichero GPX anterior del almacenamiento si existe
            if ($ruta->gpx_url) {
                // convierte la URL completa a ruta relativa para localizar el fichero en disco
                $oldRelative = str_replace(url('/storage/'), '', $ruta->gpx_url);
                $oldPath     = storage_path('app/public/' . $oldRelative);
                if (file_exists($oldPath)) {
                    unlink($oldPath); // borra físicamente el fichero anterior
                }
            }

            $path = $request->file('gpx_file')->store('gpx', 'public');
            $data['gpx_url'] = url('/storage/' . $path); // guarda siempre como URL completa, igual que en store()
        }

        $ruta->update($data);

        return response()->json([
            'message' => 'Ruta actualizada correctamente',
            'ruta'    => $ruta->fresh(), // fresh() recarga el modelo desde la BD para devolver los datos actualizados
        ]);
    }

    /**
     * Elimina una ruta del sistema.
     * Solo puede eliminarla el propietario o un administrador.
     */
    public function destroy(Request $request, Ruta $ruta)
    {
        // comprueba que el usuario es admin o es el creador de la ruta
        if (!$request->user()->hasRole('admin') && $ruta->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar esta ruta.'], 403);
        }

        $ruta->delete();
        return response()->json([
            'message' => 'Ruta eliminada correctamente'
        ]);
    }

    /**
     * Devuelve todas las rutas asociadas a un mirador concreto,
     * ordenadas por ID descendente.
     */
    public function rutaPorMirador(Mirador $mirador)
    {
        return Ruta::where('mirador_id', $mirador->id)
            ->orderBy('id', 'desc')
            ->get();
    }

    /**
     * Descarga el fichero GPX de una ruta.
     * Convierte la URL almacenada a ruta física en disco para servirlo como descarga.
     */
    public function descargarGpx(Ruta $ruta)
    {
        if (!$ruta->gpx_url) {
            return response()->json(['message' => 'No hay fichero GPX'], 404);
        }

        // convierte la URL pública a ruta absoluta en el sistema de ficheros del servidor
        $path     = str_replace(url('/storage/'), '', $ruta->gpx_url);
        $fullPath = storage_path('app/public/' . $path);

        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'Fichero no encontrado'], 404);
        }

        return response()->download($fullPath, $ruta->nombre . '.gpx'); // fuerza la descarga con el nombre de la ruta como nombre de fichero
    }
}
