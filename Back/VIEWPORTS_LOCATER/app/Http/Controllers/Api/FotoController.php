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
        $data = $request->validate([
            'url' => ['sometimes', 'required', 'string', 'max:500'],
            'fecha_subida' => ['nullable', 'date'],
            'mirador_id' => ['sometimes', 'required', 'integer', 'exists:miradores,id'],
        ]);

        $foto->update($data);

        return $foto;
    }

    public function destroy(Foto $foto)
    {
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
}
