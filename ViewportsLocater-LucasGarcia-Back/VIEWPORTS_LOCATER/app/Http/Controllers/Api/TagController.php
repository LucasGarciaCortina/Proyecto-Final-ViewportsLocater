<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\Request;

class TagController extends Controller
{
    // Listar todos los tags
    public function index()
    {
        return response()->json(
            Tag::orderBy('nombre', 'asc')->get()
        );
    }

    // Crear nuevo tag
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:50|unique:tags,nombre',
        ]);

        $tag = Tag::create($validated);
        return response()->json($tag, 201);
    }

    // Actualizar tag
    public function update(Request $request, Tag $tag)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:50|unique:tags,nombre,' . $tag->id,
        ]);

        $tag->update($validated);
        return response()->json($tag);
    }

    // Eliminar tag
    public function destroy(Tag $tag)
    {
        // DESASOCIAR DE TODOS LOS MIRADORES ANTES DE ELIMINAR
        $tag->miradores()->detach();

        $tag->delete();
        return response()->json(['message' => 'Tag eliminado correctamente.']);
    }
}
