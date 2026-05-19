<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    public function getWeather(float $lat, float $lon): ?array
    {
        $apiKey = config('services.openweather.key');
        $apiUrl = config('services.openweather.url');

        if (empty($apiKey)) {
            return null;
        }

        $cacheKey = "weather_{$lat}_{$lon}";

        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        try {
            $response = Http::timeout(5)->get($apiUrl, [
                'lat'   => $lat,
                'lon'   => $lon,
                'units' => 'metric',
                'lang'  => 'es',
                'appid' => $apiKey,
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();

            $weather = [
                'temperatura' => $data['main']['temp'] ?? null,
                'condicion'   => $data['weather'][0]['main'] ?? null,
                'descripcion' => $data['weather'][0]['description'] ?? null,
            ];

            Cache::put($cacheKey, $weather, now()->addMinutes(30));

            return $weather;
        } catch (\Throwable $e) {
            Log::warning('WeatherService: no se pudo obtener el clima.', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
