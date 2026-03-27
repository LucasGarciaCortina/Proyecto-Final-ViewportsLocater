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
        return Mirador::with(['tags:id,nombre'])->orderBy('id', 'desc')->get();
    }

    public function buscarPorNombre(Request $request)
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:150'],
        ]);

        $q = trim($data['q']);

        return Mirador::where('nombre', 'like', '%' . $q . '%')
            ->orderBy('nombre', 'asc')
            ->get();
    }

    public function MiradorPorTags(Request $request)
    {
        $data = $request->validate([
            'tags' => ['required', 'array', 'min:1'],
            'tags.*' => ['integer', 'exists:tags,id'],
        ]);

        $tagIds = $data['tags'];

        //Debe tener TODAS las tags
        $query = Mirador::query()->with(['tags:id,nombre']);

        foreach ($tagIds as $tagId) {
            $query->whereHas('tags', function ($q) use ($tagId) {
                $q->where('tags.id', $tagId);
            });
        }

        return $query->orderBy('id', 'desc')->get();
    }

    public function MiradorPorProvincia(Provincia $provincia)
    {
        return Mirador::with(['tags:id,nombre'])
            ->where('provincia_id', $provincia->id)
            ->orderBy('id', 'desc')
            ->get();
    }

    public function MiradorPorDificultad(string  $dificultad)
    {
        $rutas = Ruta::where('dificultad', $dificultad)->get();

        $miradorIds = $rutas->pluck('mirador_id')->unique();

        return Mirador::with(['tags:id,nombre'])
            ->whereIn('id', $miradorIds)
            ->orderBy('id', 'desc')
            ->get();
    }

    public function MiradorPorRadio(Request $request)
    {
        $request->validate([
            'latitud' => 'required|numeric',
            'longitud' => 'required|numeric',
            'radio' => 'required|numeric'
        ]);

        $lat = $request->latitud;
        $lng = $request->longitud;
        $radio = $request->radio;

        $miradores = DB::select(
            "
        SELECT *, (6371 * ACOS(
                    COS(RADIANS(?)) * COS(RADIANS(latitud))
                    * COS(RADIANS(longitud) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(latitud))
            )) AS distancia
        FROM miradores
        HAVING distancia <= ?
        ORDER BY distancia ASC",
            [$lat, $lng, $lat, $radio]
        );

        return response()->json($miradores);
    }

    public function OrdenarPorValoracion()
    {
        $miradores = DB::select("
        SELECT
            m.*,
            AVG(v.puntuacion) AS media_valoracion,
            COUNT(v.user_id) AS total_valoraciones
        FROM miradores m
        LEFT JOIN valoraciones v ON v.mirador_id = m.id
        GROUP BY m.id
        ORDER BY media_valoracion DESC
    ");

        return response()->json($miradores);
    }

    public function OrdenarPorCercano(Request $request)
    {
        $request->validate([
            'latitud' => 'required|numeric',
            'longitud' => 'required|numeric',
        ]);

        $lat = $request->latitud;
        $lng = $request->longitud;

        $miradores = DB::select(
            "
        SELECT
            *,
            (6371 * ACOS(
                COS(RADIANS(?))
                * COS(RADIANS(latitud))
                * COS(RADIANS(longitud) - RADIANS(?))
                + SIN(RADIANS(?))
                * SIN(RADIANS(latitud))
            )) AS distancia
        FROM miradores
        ORDER BY distancia ASC",
            [$lat, $lng, $lat]
        );

        return response()->json($miradores);
    }

    public function OrdenarPorNombre()
    {
        return Mirador::with(['tags:id,nombre'])->orderBy('nombre', 'asc')->get();
    }

    public function OrdenarPorDificultad()
    {
        $miradores = DB::select("
        SELECT
            m.*,
            MIN(
                CASE r.dificultad
                    WHEN 'facil' THEN 1
                    WHEN 'media' THEN 2
                    WHEN 'dificil' THEN 3
                END
            ) AS dificultad_orden
        FROM miradores m
        INNER JOIN rutas r ON r.mirador_id = m.id
        GROUP BY m.id
        ORDER BY dificultad_orden ASC
    ");

        return response()->json($miradores);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'latitud' => ['required', 'numeric', 'between:-90,90'],
            'longitud' => ['required', 'numeric', 'between:-180,180'],
            'provincia_id' => ['required', 'integer', 'exists:provincias,id'],
        ]);

        $mirador = Mirador::create($data);

        return response()->json([
            'mirador' => $mirador,
            'provincia' => $mirador->provincia,
        ]);
    }

    public function show(Mirador $mirador)
    {
        return response()->json([
            'mirador' => $mirador,
            'provincia' => $mirador->provincia,
            'rutas' => $mirador->rutas,
            'fotos' => $mirador->fotos,
        ]);
    }

    public function update(Request $request, Mirador $mirador)
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'latitud' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitud' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'provincia_id' => ['sometimes', 'required', 'integer', 'exists:provincias,id'],
        ]);

        $mirador->update($data);

        return response()->json([
            'mirador' => $mirador,
            'provincia' => $mirador->provincia,
        ]);
    }


    public function destroy(Mirador $mirador)
    {
        $mirador->delete();
        return response()->json([
            'message' => 'Mirador eliminado correctamente'
        ]);
    }
}
