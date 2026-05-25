<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mirador;
use App\Models\Provincia;
use App\Models\Ruta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Controlador de miradores.
 * Gestiona las operaciones CRUD sobre miradores, así como los filtrados
 * por nombre, tags, provincia y dificultad.
 */
class MiradorController extends Controller
{
    /**
     * Devuelve todos los miradores con sus relaciones básicas y la valoración media,
     * ordenados por ID descendente (más recientes primero).
     */
    public function index()
    {
        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id', 'rutas:id,mirador_id,dificultad', 'provincia:id,nombre'])
            ->withAvg('valoraciones', 'puntuacion') // calcula la media de puntuaciones directamente en la consulta SQL
            ->orderBy('id', 'desc')
            ->get();
    }

    /**
     * Busca miradores cuyo nombre contenga el texto recibido por query string (?q=...).
     */
    public function buscarPorNombre(Request $request)
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:150'],
        ]);

        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id'])
            ->where('nombre', 'like', '%' . trim($data['q']) . '%') // trim elimina espacios en los extremos del texto buscado
            ->orderBy('nombre', 'asc')
            ->get();
    }

    /**
     * Filtra miradores que tengan todos los tags indicados (filtro AND, no OR).
     * Recibe un array de IDs de tags en el body de la petición.
     */
    public function miradorPorTags(Request $request)
    {
        $data = $request->validate([
            'tags'   => ['required', 'array', 'min:1'],
            'tags.*' => ['integer', 'exists:tags,id'], // valida que cada ID del array existe en la tabla tags
        ]);

        $query = Mirador::query()->with(['tags:id,nombre', 'fotos:id,url,mirador_id']);

        // encadena un whereHas por cada tag para asegurar que el mirador los tiene TODOS (AND)
        foreach ($data['tags'] as $tagId) {
            $query->whereHas('tags', fn($q) => $q->where('tags.id', $tagId));
        }

        return $query->orderBy('id', 'desc')->get();
    }

    /**
     * Devuelve todos los miradores pertenecientes a una provincia concreta.
     */
    public function miradorPorProvincia(Provincia $provincia)
    {
        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id'])
            ->where('provincia_id', $provincia->id)
            ->orderBy('id', 'desc')
            ->get();
    }

    /**
     * Devuelve los miradores que tengan al menos una ruta con la dificultad indicada.
     */
    public function miradorPorDificultad(string $dificultad)
    {
        // obtiene los IDs de miradores que tienen rutas con esa dificultad, sin duplicados
        $miradorIds = Ruta::where('dificultad', $dificultad)->pluck('mirador_id')->unique();

        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id'])
            ->whereIn('id', $miradorIds)
            ->orderBy('id', 'desc')
            ->get();
    }

    /**
     * Crea un nuevo mirador con sus tags y fotos opcionales.
     * Asocia automáticamente el mirador al usuario autenticado.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'      => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'min:10', 'max:500'],
            'latitud'     => ['required', 'numeric', 'between:-90,90'],   // rango válido de latitud GPS
            'longitud'    => ['required', 'numeric', 'between:-180,180'], // rango válido de longitud GPS
            'provincia_id' => ['required', 'integer', 'exists:provincias,id'],
            'tag_ids'     => ['nullable', 'array'],
            'tag_ids.*'   => ['integer', 'exists:tags,id'],
            'fotos'       => ['nullable', 'array'],
            'fotos.*'     => ['string', 'max:500'],
        ]);

        // array_merge añade el user_id al array validado antes de crear el registro
        $mirador = Mirador::create(array_merge($data, [
            'user_id' => $request->user()->id,
        ]));

        if (!empty($data['tag_ids'])) {
            $mirador->tags()->attach($data['tag_ids']); // attach añade los tags a la tabla pivote sin eliminar los existentes
        }

        if (!empty($data['fotos'])) {
            foreach ($data['fotos'] as $url) {
                $mirador->fotos()->create(['url' => $url]); // crea cada foto asociada al mirador
            }
        }

        // carga las relaciones necesarias para devolver la respuesta completa
        $mirador->load(['tags:id,nombre', 'fotos:id,url,mirador_id', 'provincia:id,nombre', 'user:id,name']);

        return response()->json([
            'mirador'  => $mirador,
            'provincia' => $mirador->provincia,
        ]);
    }

    /**
     * Sincroniza los tags de un mirador con el array de IDs recibido.
     * Reemplaza completamente los tags anteriores por los nuevos.
     */
    public function attachTags(Request $request, Mirador $mirador)
    {
        $data = $request->validate([
            'tag_ids'   => ['required', 'array', 'min:1'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
        ]);

        $mirador->tags()->sync($data['tag_ids']); // sync elimina los tags anteriores y asigna los nuevos (a diferencia de attach)
        $mirador->load(['tags:id,nombre']);

        return response()->json([
            'mirador' => $mirador,
            'tags'    => $mirador->tags,
        ]);
    }

    /**
     * Devuelve el detalle completo de un mirador, incluyendo sus relaciones
     * y los datos meteorológicos actuales obtenidos de la API del tiempo.
     */
    public function show(Mirador $mirador)
    {
        $mirador->load(['tags:id,nombre', 'provincia:id,nombre', 'user:id,name', 'rutas', 'fotos']);

        // consulta el clima actual en las coordenadas del mirador a través del servicio WeatherService
        $clima = app(\App\Services\WeatherService::class)->getWeather(
            (float) $mirador->latitud,
            (float) $mirador->longitud
        );

        return response()->json([
            'mirador'  => array_merge($mirador->toArray(), ['clima' => $clima]), // fusiona los datos del mirador con el clima en un único objeto
            'provincia' => $mirador->provincia,
            'rutas'    => $mirador->rutas,
            'fotos'    => $mirador->fotos,
        ]);
    }

    /**
     * Actualiza los datos de un mirador.
     * Solo puede editarlo el propietario o un administrador.
     */
    public function update(Request $request, Mirador $mirador)
    {
        // comprueba que el usuario es admin o es el creador del mirador
        if (!$request->user()->hasRole('admin') && $mirador->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para editar este mirador.'], 403);
        }

        $data = $request->validate([
            'nombre'      => ['sometimes', 'required', 'string', 'max:150'], // 'sometimes' solo valida si el campo viene en la petición
            'descripcion' => ['nullable', 'string'],
            'latitud'     => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitud'    => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'provincia_id' => ['sometimes', 'required', 'integer', 'exists:provincias,id'],
        ]);

        $mirador->update($data);
        $mirador->load(['provincia:id,nombre', 'user:id,name']);

        return response()->json([
            'mirador'  => $mirador,
            'provincia' => $mirador->provincia,
        ]);
    }

    /**
     * Elimina un mirador del sistema.
     * Solo puede eliminarlo el propietario o un administrador.
     */
    public function destroy(Request $request, Mirador $mirador)
    {
        // comprueba que el usuario es admin o es el creador del mirador
        if (!$request->user()->hasRole('admin') && $mirador->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar este mirador.'], 403);
        }

        $mirador->delete();
        return response()->json([
            'message' => 'Mirador eliminado correctamente'
        ]);
    }
}
