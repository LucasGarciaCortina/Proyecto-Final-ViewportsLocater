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
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login',    [AuthController::class, 'login'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me',      [AuthController::class, 'me']);
    });
});

// ─── PÚBLICO (sin autenticación) ──────────────────────────────────────────────
Route::get('tags', [TagController::class, 'index']);

Route::get('provincias', [ProvinciaController::class, 'index']);
Route::get('provincias/{provincia}', [ProvinciaController::class, 'show']);

Route::get('miradores',                          [MiradorController::class, 'index']);
Route::get('miradores/buscar',                   [MiradorController::class, 'buscarPorNombre']);
Route::get('miradores/provincia/{provincia}',    [MiradorController::class, 'MiradorPorProvincia']);
Route::get('miradores/dificultad/{dificultad}',  [MiradorController::class, 'MiradorPorDificultad']);
Route::get('miradores/{mirador}',                [MiradorController::class, 'show']);
Route::post('miradores/tags',                    [MiradorController::class, 'MiradorPorTags']);

Route::get('miradores/{mirador}/rutas',          [RutaController::class, 'RutaPorMirador']);
Route::get('rutas/{ruta}',                       [RutaController::class, 'show']);

Route::get('miradores/{mirador}/fotos',          [FotoController::class, 'FotoPorMirador']);

Route::get('miradores/{mirador}/valoraciones',       [ValoracionController::class, 'index']);
Route::get('miradores/{mirador}/valoraciones/media', [ValoracionController::class, 'getMedia']);

// ─── USUARIO REGISTRADO ────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Miradores
    Route::post('miradores',              [MiradorController::class, 'store']);
    Route::put('miradores/{mirador}',     [MiradorController::class, 'update']);
    Route::delete('miradores/{mirador}',  [MiradorController::class, 'destroy']);
    Route::post('miradores/{mirador}/tags', [MiradorController::class, 'attachTags']);


    // Rutas
    Route::post('rutas',         [RutaController::class, 'store']);
    Route::post('rutas/{ruta}',   [RutaController::class, 'update']);
    Route::delete('rutas/{ruta}', [RutaController::class, 'destroy']);
    Route::get('rutas/{ruta}/descargar-gpx', [RutaController::class, 'descargarGpx']);

    // Fotos
    Route::post('fotos/upload',   [FotoController::class, 'upload']);
    Route::post('fotos',          [FotoController::class, 'store']);
    Route::delete('fotos/{foto}', [FotoController::class, 'destroy']);

    // Valoraciones
    Route::post('miradores/{mirador}/valoraciones', [ValoracionController::class, 'store']);
    Route::put('valoraciones/{id}', [ValoracionController::class, 'update']);
    Route::delete('valoraciones/{id}', [ValoracionController::class, 'destroy']);

    // Perfil
    Route::get('perfil',                  [PerfilController::class, 'index']);
    Route::get('perfil/estadisticas',     [PerfilController::class, 'estadisticas']);
    Route::get('perfil/miradores',        [PerfilController::class, 'miradores']);
    Route::get('perfil/rutas',            [PerfilController::class, 'rutas']);
    Route::get('perfil/valoraciones',     [PerfilController::class, 'valoraciones']);

    // Favoritos
    Route::get('favoritos/check/{mirador_id}', [FavoritoController::class, 'check']);
    Route::get('favoritos', [FavoritoController::class, 'index']);
    Route::post('favoritos', [FavoritoController::class, 'store']);
    Route::delete('favoritos/{mirador_id}', [FavoritoController::class, 'destroy']);


    // Chatbot
    Route::prefix('chatbot')->group(function () {
        Route::get('suggestions', [ChatbotController::class, 'getSuggestions']);
        Route::post('query', [ChatbotController::class, 'processQuery']);
    });


    // Admin
    Route::middleware('role:admin')->group(function () {
        Route::prefix('admin')->group(function () {
            Route::get('estadisticas',          [AdminController::class, 'estadisticas']);
            Route::get('usuarios',              [AdminController::class, 'usuarios']);
            Route::delete('usuarios/{user}',    [AdminController::class, 'destroyUsuario']);
            Route::put('usuarios/{user}/rol',   [AdminController::class, 'asignarRol']);
            Route::get('miradores',             [AdminController::class, 'miradores']);
            Route::delete('miradores/{mirador}', [AdminController::class, 'destroyMirador']);
            Route::get('rutas',                 [AdminController::class, 'rutas']);
            Route::delete('rutas/{ruta}',       [AdminController::class, 'destroyRuta']);
            Route::post('tags', [TagController::class, 'store']);
            Route::put('tags/{tag}', [TagController::class, 'update']);
            Route::delete('tags/{tag}', [TagController::class, 'destroy']);
        });
    });
});
