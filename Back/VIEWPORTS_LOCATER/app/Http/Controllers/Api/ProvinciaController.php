<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Provincia;
use Illuminate\Http\Request;

class ProvinciaController extends Controller
{
    public function index()
    {
        return Provincia::orderBy('nombre')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate(
            ['nombre' => 'required|string|max:100|unique:provincias,nombre']
        );

        $provincia = Provincia::create($data);

        return response()->json($provincia);
    }


    public function show(Provincia $provincia)
    {
        return $provincia;
    }

    public function update(Request $request, Provincia $provincia)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:provincias,nombre,' . $provincia->id],
        ]);

        $provincia->update($data);

        return $provincia;
    }

    public function destroy(Provincia $provincia)
    {
        $provincia->delete();

        return response()->json([
            'message' => 'Provincia eliminada correctamente'
        ], 200);
    }
}
