<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mirador;
use App\Models\Provincia;
use App\Models\Ruta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MiradorController extends Controller
{

    public function index()
    {
        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id', 'rutas:id,mirador_id,dificultad', 'provincia:id,nombre'])
            ->withAvg('valoraciones', 'puntuacion')
            ->orderBy('id', 'desc')
            ->get();
    }

    public function buscarPorNombre(Request $request)
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:150'],
        ]);

        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id'])
            ->where('nombre', 'like', '%' . trim($data['q']) . '%')
            ->orderBy('nombre', 'asc')
            ->get();
    }

    public function MiradorPorTags(Request $request)
    {
        $data = $request->validate([
            'tags' => ['required', 'array', 'min:1'],
            'tags.*' => ['integer', 'exists:tags,id'],
        ]);

        $query = Mirador::query()->with(['tags:id,nombre', 'fotos:id,url,mirador_id']);

        foreach ($data['tags'] as $tagId) {
            $query->whereHas('tags', fn($q) => $q->where('tags.id', $tagId));
        }

        return $query->orderBy('id', 'desc')->get();
    }

    public function MiradorPorProvincia(Provincia $provincia)
    {
        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id'])
            ->where('provincia_id', $provincia->id)
            ->orderBy('id', 'desc')
            ->get();
    }

    public function MiradorPorDificultad(string $dificultad)
    {
        $miradorIds = Ruta::where('dificultad', $dificultad)->pluck('mirador_id')->unique();

        return Mirador::with(['tags:id,nombre', 'fotos:id,url,mirador_id'])
            ->whereIn('id', $miradorIds)
            ->orderBy('id', 'desc')
            ->get();
    }





    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'min:10', 'max:500'],
            'latitud' => ['required', 'numeric', 'between:-90,90'],
            'longitud' => ['required', 'numeric', 'between:-180,180'],
            'provincia_id' => ['required', 'integer', 'exists:provincias,id'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
            'fotos' => ['nullable', 'array'],
            'fotos.*' => ['string', 'max:500'],
        ]);

        $mirador = Mirador::create(array_merge($data, [
            'user_id' => $request->user()->id,
        ]));

        if (!empty($data['tag_ids'])) {
            $mirador->tags()->attach($data['tag_ids']);
        }

        if (!empty($data['fotos'])) {
            foreach ($data['fotos'] as $url) {
                $mirador->fotos()->create(['url' => $url]);
            }
        }


        $mirador->load(['tags:id,nombre', 'fotos:id,url,mirador_id', 'provincia:id,nombre', 'user:id,name']);

        return response()->json([
            'mirador' => $mirador,
            'provincia' => $mirador->provincia,
        ]);
    }

    public function attachTags(Request $request, Mirador $mirador)
    {
        $data = $request->validate([
            'tag_ids' => ['required', 'array', 'min:1'],
            'tag_ids.*' => ['integer', 'exists:tags,id'],
        ]);

        $mirador->tags()->sync($data['tag_ids']);
        $mirador->load(['tags:id,nombre']);

        return response()->json([
            'mirador' => $mirador,
            'tags' => $mirador->tags,
        ]);
    }

    public function show(Mirador $mirador)
    {
        $mirador->load(['tags:id,nombre', 'provincia:id,nombre', 'user:id,name', 'rutas', 'fotos']);

        $clima = app(\App\Services\WeatherService::class)->getWeather(
            (float) $mirador->latitud,
            (float) $mirador->longitud
        );

        return response()->json([
            'mirador'   => array_merge($mirador->toArray(), ['clima' => $clima]),
            'provincia' => $mirador->provincia,
            'rutas'     => $mirador->rutas,
            'fotos'     => $mirador->fotos,
        ]);
    }

    public function update(Request $request, Mirador $mirador)
    {
        if (!$request->user()->hasRole('admin') && $mirador->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para editar este mirador.'], 403);
        }

        $data = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'latitud' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitud' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'provincia_id' => ['sometimes', 'required', 'integer', 'exists:provincias,id'],
        ]);

        $mirador->update($data);
        $mirador->load(['provincia:id,nombre', 'user:id,name']);

        return response()->json([
            'mirador' => $mirador,
            'provincia' => $mirador->provincia,
        ]);
    }


    public function destroy(Request $request, Mirador $mirador)
    {
        if (!$request->user()->hasRole('admin') && $mirador->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar este mirador.'], 403);
        }

        $mirador->delete();
        return response()->json([
            'message' => 'Mirador eliminado correctamente'
        ]);
    }
}
