<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;

/**
 * Controlador de tags.
 * Gestiona las operaciones CRUD sobre las etiquetas que pueden asociarse a los miradores.
 * La creación, edición y eliminación están restringidas a administradores (definido en rutas).
 */
class TagController extends Controller
{
    // Listar todos los tags
    /**
     * Devuelve todos los tags ordenados alfabéticamente por nombre.
     */
    public function index()
    {
        return response()->json(
            Tag::orderBy('nombre', 'asc')->get()
        );
    }

    // Crear nuevo tag
    /**
     * Crea un nuevo tag.
     * El nombre debe ser único en la tabla de tags.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:50|unique:tags,nombre', // unique:tags,nombre verifica que no exista ya ese nombre en la BD
        ]);

        $tag = Tag::create($validated);
        return response()->json($tag, 201); // 201 Created
    }

    // Actualizar tag
    /**
     * Actualiza el nombre de un tag.
     * La regla unique excluye el propio tag del chequeo de unicidad
     * para permitir guardar sin cambiar el nombre.
     */
    public function update(Request $request, Tag $tag)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:50|unique:tags,nombre,' . $tag->id, // el ",{$tag->id}" al final excluye el registro actual de la validación unique
        ]);

        $tag->update($validated);
        return response()->json($tag);
    }

    // Eliminar tag
    /**
     * Elimina un tag del sistema.
     * Antes de eliminarlo, lo desasocia de todos los miradores que lo tuvieran asignado
     * para mantener la integridad de la tabla pivote.
     */
    public function destroy(Tag $tag)
    {
        // DESASOCIAR DE TODOS LOS MIRADORES ANTES DE ELIMINAR
        $tag->miradores()->detach(); // detach elimina los registros de la tabla pivote mirador_tag sin tocar los miradores

        $tag->delete();
        return response()->json(['message' => 'Tag eliminado correctamente.']);
    }
}
