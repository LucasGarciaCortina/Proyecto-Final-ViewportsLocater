<?php

use App\Http\Controllers\Api\FotoController;
use App\Http\Controllers\Api\MiradorController;
use App\Http\Controllers\Api\ProvinciaController;
use App\Http\Controllers\Api\RutaController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::get('tags', [TagController::class, 'index']);
Route::post('miradores/tags', [MiradorController::class, 'MiradorPorTags']);

//Miradores por nombre
Route::get('miradores/buscar', [MiradorController::class, 'buscarPorNombre']);

Route::apiResource('provincias', ProvinciaController::class);
Route::apiResource('miradores', MiradorController::class)
    ->parameters(['miradores' => 'mirador']);
Route::apiResource('rutas', RutaController::class);
Route::apiResource('fotos', FotoController::class);

Route::get('miradores/{mirador}/rutas', [RutaController::class, 'RutaPorMirador']);
Route::get('miradores/{mirador}/fotos', [FotoController::class, 'FotoPorMirador']);

//Filtrado de miradores



//Miradores por provincia
Route::get('miradores/provincia/{provincia}', [MiradorController::class, 'MiradorPorProvincia']);

//Miradores por dificultad (facil / media / dificil)
Route::get('miradores/dificultad/{dificultad}', [MiradorController::class, 'MiradorPorDificultad']);

//Miradores por radio (requiere latitud, longitud y radio en body)
Route::post('miradores/radio', [MiradorController::class, 'MiradorPorRadio']);

//Ordenar miradores

//Ordenar por valoración media
Route::get('miradores/ordenar/valoracion', [MiradorController::class, 'OrdenarPorValoracion']);

//Ordenar por cercanía (requiere latitud y longitud en body)
Route::post('miradores/ordenar/cercano', [MiradorController::class, 'OrdenarPorCercano']);

//Ordenar por nombre (A-Z)
Route::get('miradores/ordenar/nombre', [MiradorController::class, 'OrdenarPorNombre']);

//Ordenar por dificultad
Route::get('miradores/ordenar/dificultad', [MiradorController::class, 'OrdenarPorDificultad']);
