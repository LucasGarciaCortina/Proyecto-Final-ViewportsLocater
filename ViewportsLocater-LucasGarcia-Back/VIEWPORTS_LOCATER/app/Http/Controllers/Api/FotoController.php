<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Foto;
use App\Models\Mirador;
use Illuminate\Http\Request;

class FotoController extends Controller
{
    public function index()
    {
        return Foto::orderBy('id', 'desc')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'url' => ['required', 'string', 'max:500'],
            'fecha_subida' => ['nullable', 'date'],
            'mirador_id' => ['required', 'integer', 'exists:miradores,id'],
        ]);

        $foto = Foto::create($data);

        return response()->json($foto, 201);
    }

    public function show(Foto $foto)
    {
        return $foto;
    }

    public function update(Request $request, Foto $foto)
    {
        if (!$request->user()->hasRole('admin') && $foto->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para editar esta foto.'], 403);
        }

        $data = $request->validate([
            'url' => ['sometimes', 'required', 'string', 'max:500'],
            'fecha_subida' => ['nullable', 'date'],
            'mirador_id' => ['sometimes', 'required', 'integer', 'exists:miradores,id'],
        ]);

        $foto->update($data);

        return $foto;
    }

    public function destroy(Request $request, Foto $foto)
    {
        if (!$request->user()->hasRole('admin') && $foto->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar esta foto.'], 403);
        }

        $foto->delete();
        return response()->json([
            'message' => 'Foto eliminada correctamente'
        ]);
    }


    public function FotoPorMirador(Mirador $mirador)
    {
        return Foto::where('mirador_id', $mirador->id)
            ->orderBy('id', 'desc')
            ->get();
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'mirador_id' => ['nullable', 'integer', 'exists:miradores,id'],
        ]);

        $path = $request->file('file')->store('fotos', 'public');
        $url = url('/storage/' . $path);

        if ($request->filled('mirador_id')) {
            $foto = Foto::create([
                'url' => $url,
                'mirador_id' => $request->integer('mirador_id'),
                'user_id'   => $request->user()->id,
            ]);

            return response()->json(['foto' => $foto, 'url' => $url], 201);
        }

        return response()->json(['foto' => null, 'url' => $url], 201);
    }
}
