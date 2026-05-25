<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Servicio de meteorología.
 * Consulta la API de OpenWeatherMap para obtener las condiciones climáticas
 * actuales en unas coordenadas GPS dadas. Los resultados se cachean 30 minutos
 * para evitar llamadas repetidas a la API por el mismo punto.
 */
class WeatherService
{
    /**
     * Obtiene los datos meteorológicos actuales para unas coordenadas concretas.
     * Devuelve null si no hay clave de API configurada, si la petición falla
     * o si ocurre cualquier error inesperado.
     *
     * @param float $lat Latitud del punto
     * @param float $lon Longitud del punto
     */
    public function getWeather(float $lat, float $lon): ?array
    {
        $apiKey = config('services.openweather.key');
        $apiUrl = config('services.openweather.url');

        // si no hay clave configurada, no intenta la llamada
        if (empty($apiKey)) {
            return null;
        }

        // clave única de caché por coordenadas para reutilizar resultados recientes
        $cacheKey = "weather_{$lat}_{$lon}";

        // devuelve el resultado cacheado si aún es válido, evitando una llamada a la API
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        try {
            // timeout de 5 segundos para no bloquear la respuesta si la API tarda
            $response = Http::timeout(5)->get($apiUrl, [
                'lat'   => $lat,
                'lon'   => $lon,
                'units' => 'metric', // temperatura en grados Celsius
                'lang'  => 'es',     // descripciones del tiempo en español
                'appid' => $apiKey,
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();

            // extrae solo los campos necesarios para la respuesta del frontend
            $weather = [
                'temperatura' => $data['main']['temp'] ?? null,
                'condicion'   => $data['weather'][0]['main'] ?? null,        // condición general (ej: "Clouds")
                'descripcion' => $data['weather'][0]['description'] ?? null, // descripción detallada (ej: "nubes dispersas")
            ];

            Cache::put($cacheKey, $weather, now()->addMinutes(30)); // cachea el resultado 30 minutos

            return $weather;

        } catch (\Throwable $e) {
            // captura cualquier excepción (red, timeout, etc.) y la registra sin interrumpir la aplicación
            Log::warning('WeatherService: no se pudo obtener el clima.', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
