<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Provincia;
use Illuminate\Http\Request;

/**
 * Controlador de provincias.
 * Gestiona las operaciones CRUD sobre las provincias del sistema.
 */
class ProvinciaController extends Controller
{
    /**
     * Devuelve todas las provincias ordenadas alfabéticamente por nombre.
     */
    public function index()
    {
        return Provincia::orderBy('nombre')->get();
    }

    /**
     * Crea una nueva provincia.
     * El nombre debe ser único en la tabla de provincias.
     */
    public function store(Request $request)
    {
        $data = $request->validate(
            ['nombre' => 'required|string|max:100|unique:provincias,nombre'] // unique:provincias,nombre verifica que no exista ya ese nombre en la BD
        );

        $provincia = Provincia::create($data);

        return response()->json($provincia);
    }

    /**
     * Devuelve los datos de una provincia concreta.
     */
    public function show(Provincia $provincia)
    {
        return $provincia;
    }

    /**
     * Actualiza el nombre de una provincia.
     * La regla unique excluye la propia provincia del chequeo de unicidad
     * para permitir guardar sin cambiar el nombre.
     */
    public function update(Request $request, Provincia $provincia)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:provincias,nombre,' . $provincia->id], // el ",{$provincia->id}" al final excluye el registro actual de la validación unique
        ]);

        $provincia->update($data);

        return $provincia;
    }

    /**
     * Elimina una provincia del sistema.
     */
    public function destroy(Provincia $provincia)
    {
        $provincia->delete();

        return response()->json([
            'message' => 'Provincia eliminada correctamente'
        ], 200);
    }
}
