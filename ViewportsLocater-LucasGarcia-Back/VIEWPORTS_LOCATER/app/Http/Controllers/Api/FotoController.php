<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Foto;
use App\Models\Mirador;
use Illuminate\Http\Request;

/**
 * Controlador de fotos.
 * Gestiona las operaciones CRUD sobre las fotos asociadas a miradores,
 * incluyendo la subida de archivos al almacenamiento local.
 */
class FotoController extends Controller
{
    /**
     * Devuelve todas las fotos ordenadas por ID descendente (más recientes primero).
     */
    public function index()
    {
        return Foto::orderBy('id', 'desc')->get();
    }

    /**
     * Crea un registro de foto a partir de una URL ya existente.
     * No gestiona la subida del archivo; para eso se usa el método upload().
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'url'         => ['required', 'string', 'max:500'],
            'fecha_subida' => ['nullable', 'date'],
            'mirador_id'  => ['required', 'integer', 'exists:miradores,id'],
        ]);

        $foto = Foto::create($data);

        return response()->json($foto, 201); // 201 Created
    }

    /**
     * Devuelve los datos de una foto concreta.
     */
    public function show(Foto $foto)
    {
        return $foto;
    }

    /**
     * Actualiza los datos de una foto.
     * Solo puede editarla el propietario de la foto o un administrador.
     */
    public function update(Request $request, Foto $foto)
    {
        // comprueba que el usuario es admin o es el propietario de la foto
        if (!$request->user()->hasRole('admin') && $foto->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para editar esta foto.'], 403);
        }

        $data = $request->validate([
            'url'         => ['sometimes', 'required', 'string', 'max:500'], // 'sometimes' solo valida el campo si viene en la petición
            'fecha_subida' => ['nullable', 'date'],
            'mirador_id'  => ['sometimes', 'required', 'integer', 'exists:miradores,id'],
        ]);

        $foto->update($data);

        return $foto;
    }

    /**
     * Elimina una foto del sistema.
     * Solo puede eliminarla el propietario de la foto o un administrador.
     */
    public function destroy(Request $request, Foto $foto)
    {
        // comprueba que el usuario es admin o es el propietario de la foto
        if (!$request->user()->hasRole('admin') && $foto->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No tienes permiso para eliminar esta foto.'], 403);
        }

        $foto->delete();
        return response()->json([
            'message' => 'Foto eliminada correctamente'
        ]);
    }

    /**
     * Devuelve todas las fotos asociadas a un mirador concreto,
     * ordenadas por ID descendente (más recientes primero).
     */
    public function fotoPorMirador(Mirador $mirador)
    {
        return Foto::where('mirador_id', $mirador->id)
            ->orderBy('id', 'desc')
            ->get();
    }

    /**
     * Gestiona la subida física de un archivo de imagen al almacenamiento local.
     * Si se proporciona un mirador_id, también crea el registro en la base de datos.
     * Si no se proporciona, devuelve solo la URL pública del archivo subido.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file'      => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'], // máximo 5 MB
            'mirador_id' => ['nullable', 'integer', 'exists:miradores,id'],
        ]);

        // guarda el archivo en storage/app/public/fotos y genera la URL pública accesible
        $path = $request->file('file')->store('fotos', 'public');
        $url  = url('/storage/' . $path);

        if ($request->filled('mirador_id')) {
            // si se especifica mirador, crea el registro de foto vinculado al mirador y al usuario
            $foto = Foto::create([
                'url'       => $url,
                'mirador_id' => $request->integer('mirador_id'),
                'user_id'   => $request->user()->id,
            ]);

            return response()->json(['foto' => $foto, 'url' => $url], 201);
        }

        // si no hay mirador_id, devuelve solo la URL sin crear registro en la BD
        return response()->json(['foto' => null, 'url' => $url], 201);
    }
}
