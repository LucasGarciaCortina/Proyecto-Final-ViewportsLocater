<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FavoritoController;
use App\Http\Controllers\Api\FotoController;
use App\Http\Controllers\Api\MiradorController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\ProvinciaController;
use App\Http\Controllers\Api\RutaController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\ValoracionController;
use App\Http\Controllers\ChatbotController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ─── AUTH ─────────────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1'); // máximo 10 intentos de registro por minuto por IP
    Route::post('login',    [AuthController::class, 'login'])->middleware('throttle:5,1');     // máximo 5 intentos de login por minuto por IP, para evitar fuerza bruta

    // Rutas que requieren token válido de Sanctum
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me',      [AuthController::class, 'me']);
    });
});

// ─── PÚBLICO (sin autenticación) ──────────────────────────────────────────────
// Estas rutas son accesibles sin necesidad de estar autenticado

Route::get('tags', [TagController::class, 'index']);

Route::get('provincias',             [ProvinciaController::class, 'index']);
Route::get('provincias/{provincia}', [ProvinciaController::class, 'show']);

// Las rutas estáticas ('buscar', 'provincia', 'dificultad') deben ir antes de '{mirador}'
// para que Laravel no interprete esos segmentos como un ID de mirador
Route::get('miradores',                         [MiradorController::class, 'index']);
Route::get('miradores/buscar',                  [MiradorController::class, 'buscarPorNombre']);
Route::get('miradores/provincia/{provincia}',   [MiradorController::class, 'miradorPorProvincia']);
Route::get('miradores/dificultad/{dificultad}', [MiradorController::class, 'miradorPorDificultad']);
Route::get('miradores/{mirador}',               [MiradorController::class, 'show']);
Route::post('miradores/tags',                   [MiradorController::class, 'miradorPorTags']); // usa POST para poder enviar un array de tags en el body

Route::get('miradores/{mirador}/rutas', [RutaController::class, 'rutaPorMirador']);
Route::get('rutas/{ruta}',              [RutaController::class, 'show']);

Route::get('miradores/{mirador}/fotos', [FotoController::class, 'fotoPorMirador']);

Route::get('miradores/{mirador}/valoraciones',       [ValoracionController::class, 'index']);
Route::get('miradores/{mirador}/valoraciones/media', [ValoracionController::class, 'getMedia']);

// ─── USUARIO REGISTRADO ────────────────────────────────────────────────────────
// Todas las rutas dentro de este grupo requieren token válido de Sanctum
Route::middleware('auth:sanctum')->group(function () {

    // Miradores
    Route::post('miradores',                [MiradorController::class, 'store']);
    Route::put('miradores/{mirador}',       [MiradorController::class, 'update']);
    Route::delete('miradores/{mirador}',    [MiradorController::class, 'destroy']);
    Route::post('miradores/{mirador}/tags', [MiradorController::class, 'attachTags']);

    // Rutas de senderismo
    Route::post('rutas',                     [RutaController::class, 'store']);
    Route::post('rutas/{ruta}',              [RutaController::class, 'update']);    // usa POST en lugar de PUT para permitir subida de fichero GPX junto con los datos
    Route::delete('rutas/{ruta}',            [RutaController::class, 'destroy']);
    Route::get('rutas/{ruta}/descargar-gpx', [RutaController::class, 'descargarGpx']);

    // Fotos
    Route::post('fotos/upload',   [FotoController::class, 'upload']); // subida física del archivo al almacenamiento
    Route::post('fotos',          [FotoController::class, 'store']);   // registro de foto por URL ya existente
    Route::delete('fotos/{foto}', [FotoController::class, 'destroy']);

    // Valoraciones
    Route::post('miradores/{mirador}/valoraciones', [ValoracionController::class, 'store']);
    Route::put('valoraciones/{id}',                 [ValoracionController::class, 'update']);
    Route::delete('valoraciones/{id}',              [ValoracionController::class, 'destroy']);

    // Perfil del usuario autenticado
    Route::get('perfil',              [PerfilController::class, 'index']);
    Route::get('perfil/estadisticas', [PerfilController::class, 'estadisticas']);
    Route::get('perfil/miradores',    [PerfilController::class, 'miradores']);
    Route::get('perfil/rutas',        [PerfilController::class, 'rutas']);
    Route::get('perfil/valoraciones', [PerfilController::class, 'valoraciones']);

    // Favoritos
    // 'favoritos/check/{mirador_id}' debe ir antes de 'favoritos/{mirador_id}'
    // para que Laravel no confunda 'check' con un ID
    Route::get('favoritos/check/{mirador_id}', [FavoritoController::class, 'check']);
    Route::get('favoritos',                    [FavoritoController::class, 'index']);
    Route::post('favoritos',                   [FavoritoController::class, 'store']);
    Route::delete('favoritos/{mirador_id}',    [FavoritoController::class, 'destroy']);

    // Chatbot
    Route::prefix('chatbot')->group(function () {
        Route::get('suggestions', [ChatbotController::class, 'getSuggestions']);
        Route::post('query',      [ChatbotController::class, 'processQuery']);
    });

    // Admin - requiere adicionalmente el rol 'admin' (middleware de Spatie)
    Route::middleware('role:admin')->group(function () {
        Route::prefix('admin')->group(function () {
            Route::get('estadisticas',           [AdminController::class, 'estadisticas']);
            Route::get('usuarios',               [AdminController::class, 'usuarios']);
            Route::delete('usuarios/{user}',     [AdminController::class, 'destroyUsuario']);
            Route::put('usuarios/{user}/rol',    [AdminController::class, 'asignarRol']);
            Route::get('miradores',              [AdminController::class, 'miradores']);
            Route::delete('miradores/{mirador}', [AdminController::class, 'destroyMirador']);
            Route::get('rutas',                  [AdminController::class, 'rutas']);
            Route::delete('rutas/{ruta}',        [AdminController::class, 'destroyRuta']);
            // Gestión de tags exclusiva para administradores
            Route::post('tags',         [TagController::class, 'store']);
            Route::put('tags/{tag}',    [TagController::class, 'update']);
            Route::delete('tags/{tag}', [TagController::class, 'destroy']);
        });
    });
});
