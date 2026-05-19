<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Mirador;

class ChatbotService
{
    private $openaiKey;
    private $model = 'gpt-4o-mini';

    private const TAGS_BD = [
        'Accesible', 'Montaña', 'Costa', 'Bosque', 'Valle',
        'Urbano', 'Rural', 'Cascada', 'Lago', 'Río',
        'Apto para niños', 'Parking cercano', 'Zona de picnic',
        'Difícil acceso', 'Sendero señalizado', 'Vista al mar',
        'Vista a la ciudad', 'Amanecer', 'Atardecer', 'Panorámico',
    ];

    private const DIFICULTADES_BD = ['facil', 'media', 'dificil'];

    public function __construct()
    {
        $this->openaiKey = config('services.openai.api_key');
    }

    public function processQuery($query)
    {
        if (!Auth::check()) {
            return $this->errorResponse('Debes estar logueado para usar el chatbot');
        }

        $userId = Auth::id();
        $cacheKey = "chatbot_queries_{$userId}";
        $queryCount = Cache::get($cacheKey, 0);
        if ($queryCount >= 20) {
            return $this->errorResponse('Has alcanzado el límite de 20 consultas por hora. Intenta más tarde.');
        }
        Cache::put($cacheKey, $queryCount + 1, now()->addHour());

        try {
            $response = Http::timeout(15)->withHeaders([
                'Authorization' => 'Bearer ' . $this->openaiKey,
                'Content-Type'  => 'application/json',
            ])->post('https://api.openai.com/v1/chat/completions', [
                'model'           => $this->model,
                'messages'        => [
                    ['role' => 'system', 'content' => $this->getSystemPrompt()],
                    ['role' => 'user',   'content' => $this->buildPrompt($query)],
                ],
                'temperature'     => 0.2,
                'max_tokens'      => 400,
                'response_format' => ['type' => 'json_object'],
            ]);

            if ($response->failed()) {
                Log::error('ChatbotService OpenAI error: ' . $response->body());
                return $this->errorResponse('Error al conectar con el servicio de IA. Inténtalo de nuevo.');
            }

            $content = json_decode($response->json()['choices'][0]['message']['content'], true);

            if (!is_array($content)) {
                return $this->errorResponse('Error procesando la respuesta de IA.');
            }

            Log::info('Chatbot criteria: ' . json_encode($content));

            if (isset($content['off_topic']) && $content['off_topic'] === true) {
                return [
                    'success'    => false,
                    'message'    => 'Solo puedo ayudarte a encontrar miradores y rutas. Prueba con preguntas como "miradores en Asturias" o "rutas fáciles en la costa".',
                    'viewpoints' => [],
                    'count'      => 0,
                ];
            }

            return $this->searchViewpoints($content);

        } catch (\Exception $e) {
            Log::error('ChatbotService error: ' . $e->getMessage());
            return $this->errorResponse('Error inesperado. Inténtalo de nuevo.');
        }
    }

    private function getSystemPrompt(): string
    {
        $tagsList = implode(', ', self::TAGS_BD);

        return <<<PROMPT
Eres un asistente especializado en encontrar miradores naturales en España.
Tu única tarea es analizar consultas y extraer criterios de búsqueda en formato JSON.

REGLAS ESTRICTAS:
1. Responde SIEMPRE con JSON válido y nada más.
2. Si la consulta NO tiene nada que ver con miradores, naturaleza, rutas o senderismo, devuelve {"off_topic": true}.
3. Nunca inventes datos. Solo extrae lo que el usuario menciona explícitamente.
4. Los tags deben coincidir EXACTAMENTE con los disponibles: $tagsList
5. La dificultad SOLO puede ser: "facil", "media" o "dificil".
6. DISTINGUE entre provincia/comunidad autónoma (campo "provincia") y ciudad concreta (campo "ciudad").
PROMPT;
    }

    private function buildPrompt(string $query): string
    {
        $tagsList      = implode(', ', self::TAGS_BD);
        $provinciaList = implode(', ', array_keys($this->getProvinciasMap()));
        $ciudadList    = implode(', ', array_keys($this->getCiudadesMap()));

        return <<<PROMPT
Consulta del usuario: "$query"

Devuelve SOLO este JSON:

{
  "off_topic": false,
  "provincia": null,
  "ciudad": null,
  "radius": null,
  "tags": [],
  "difficulty": [],
  "min_rating": null,
  "explanation": "..."
}

INSTRUCCIONES:
- off_topic: true si no tiene relación con miradores, naturaleza, rutas o senderismo.
- provincia: comunidad autónoma o provincia mencionada. Valores válidos: $provinciaList. null si no aplica.
- ciudad: ciudad concreta (NO provincia). Valores válidos: $ciudadList. null si no aplica.
- radius: km de radio, SOLO si hay ciudad. Si hay ciudad sin radio explícito, usa 50. Si solo hay provincia, null.
- tags: array con tags EXACTOS de: $tagsList. Vacío si no hay coincidencia.
- difficulty: array con "facil", "media" o "dificil" únicamente. Vacío si no especifica.
- min_rating: número 1-5 si menciona valoración mínima. null si no menciona.
- explanation: frase corta (máx 15 palabras) describiendo la búsqueda.

EJEMPLOS:
- "miradores en asturias" → {"off_topic":false,"provincia":"Asturias","ciudad":null,"radius":null,"tags":[],"difficulty":[],"min_rating":null,"explanation":"Miradores en Asturias"}
- "miradores en cantabria accesibles" → {"off_topic":false,"provincia":"Cantabria","ciudad":null,"radius":null,"tags":["Accesible"],"difficulty":[],"min_rating":null,"explanation":"Miradores accesibles en Cantabria"}
- "cerca de Oviedo" → {"off_topic":false,"provincia":null,"ciudad":"Oviedo","radius":50,"tags":[],"difficulty":[],"min_rating":null,"explanation":"Miradores cerca de Oviedo"}
- "rutas fáciles en la montaña" → {"off_topic":false,"provincia":null,"ciudad":null,"radius":null,"tags":["Montaña"],"difficulty":["facil"],"min_rating":null,"explanation":"Rutas fáciles en montaña"}
- "¿cómo se hace una paella?" → {"off_topic":true}
PROMPT;
    }

    private function searchViewpoints(array $criteria): array
    {
        $query = Mirador::query();
        $usaHaversine = false;

        // OPCIÓN A — Filtro por provincia exacta (JOIN con tabla provincias)
        if (!empty($criteria['provincia'])) {
            $nombreProvincia = $criteria['provincia'];
            $query->whereHas('provincia', function ($q) use ($nombreProvincia) {
                $q->whereRaw('LOWER(nombre) = ?', [strtolower($nombreProvincia)]);
            });
        }

        // OPCIÓN B — Filtro por radio desde ciudad concreta
        if (empty($criteria['provincia']) && !empty($criteria['ciudad']) && !empty($criteria['radius'])) {
            $coords = $this->getCiudadCoordinates($criteria['ciudad']);
            if ($coords) {
                [$lat, $lng] = $coords;
                $radius = is_numeric($criteria['radius']) ? (float) $criteria['radius'] : 50;
                $query->selectRaw(
                    'miradores.*, (6371 * acos(cos(radians(?)) * cos(radians(latitud)) * cos(radians(longitud) - radians(?)) + sin(radians(?)) * sin(radians(latitud)))) AS distancia_chatbot',
                    [$lat, $lng, $lat]
                )->havingRaw('distancia_chatbot <= ?', [$radius])
                 ->orderByRaw('distancia_chatbot ASC');
                $usaHaversine = true;
            }
        }

        // Filtro por tags
        if (!empty($criteria['tags']) && is_array($criteria['tags'])) {
            $tags = array_filter($criteria['tags']);
            if (!empty($tags)) {
                $query->whereHas('tags', function ($q) use ($tags) {
                    $q->whereIn(DB::raw('LOWER(nombre)'), array_map('strtolower', $tags));
                });
            }
        }

        // Filtro por dificultad
        if (!empty($criteria['difficulty']) && is_array($criteria['difficulty'])) {
            $difficulty = array_filter($criteria['difficulty'], fn($d) => in_array($d, self::DIFICULTADES_BD));
            if (!empty($difficulty)) {
                $query->whereHas('rutas', function ($q) use ($difficulty) {
                    $q->whereIn('dificultad', $difficulty);
                });
            }
        }

        // Filtro por valoración mínima
        if (!empty($criteria['min_rating']) && is_numeric($criteria['min_rating'])) {
            $query->leftJoin('valoraciones', 'miradores.id', '=', 'valoraciones.mirador_id')
                  ->groupBy('miradores.id')
                  ->havingRaw('AVG(valoraciones.puntuacion) >= ?', [(float) $criteria['min_rating']]);
        }

        $miradores = $query
            ->distinct()
            ->with(['rutas:id,mirador_id,nombre,dificultad,distancia_km', 'tags:id,nombre', 'provincia:id,nombre'])
            ->withAvg('valoraciones', 'puntuacion')
            ->orderByDesc('valoraciones_avg_puntuacion')
            ->limit(5)
            ->get();

        // Fallback: si no hay resultados con filtros restrictivos, reintentar solo con ubicación
        if ($miradores->isEmpty()) {
            $miradores = $this->fallbackSearch($criteria);
            if ($miradores->isNotEmpty()) {
                $criteria['explanation'] = 'No encontré resultados exactos. Te muestro los mejores de la zona:';
            }
        }

        if ($miradores->isEmpty()) {
            return [
                'success'     => true,
                'explanation' => $this->buildNoResultsMessage($criteria),
                'viewpoints'  => [],
                'count'       => 0,
            ];
        }

        // Referencia para calcular distancias en la respuesta
        $coordsRef = null;
        if (!empty($criteria['ciudad'])) {
            $coordsRef = $this->getCiudadCoordinates($criteria['ciudad']);
        } elseif (!empty($criteria['provincia'])) {
            $coordsRef = $this->getProvinciaCoordinates($criteria['provincia']);
        }

        $viewpoints = $this->formatViewpoints($miradores, $coordsRef);

        return [
            'success'     => true,
            'explanation' => $criteria['explanation'] ?? 'Estos son los miradores que he encontrado:',
            'criteria'    => $criteria,
            'viewpoints'  => $viewpoints,
            'count'       => count($viewpoints),
        ];
    }

    private function fallbackSearch(array $criteria): \Illuminate\Support\Collection
    {
        $query2 = Mirador::query();

        if (!empty($criteria['provincia'])) {
            $nombreProvincia = $criteria['provincia'];
            $query2->whereHas('provincia', function ($q) use ($nombreProvincia) {
                $q->whereRaw('LOWER(nombre) = ?', [strtolower($nombreProvincia)]);
            });
        } elseif (!empty($criteria['ciudad']) && !empty($criteria['radius'])) {
            $coords = $this->getCiudadCoordinates($criteria['ciudad']);
            if ($coords) {
                [$lat, $lng] = $coords;
                $query2->selectRaw(
                    'miradores.*, (6371 * acos(cos(radians(?)) * cos(radians(latitud)) * cos(radians(longitud) - radians(?)) + sin(radians(?)) * sin(radians(latitud)))) AS distancia_chatbot',
                    [$lat, $lng, $lat]
                )->havingRaw('distancia_chatbot <= ?', [(float) $criteria['radius']])
                 ->orderByRaw('distancia_chatbot ASC');
            }
        } else {
            return collect();
        }

        return $query2
            ->with(['rutas:id,mirador_id,nombre,dificultad,distancia_km', 'tags:id,nombre', 'provincia:id,nombre'])
            ->withAvg('valoraciones', 'puntuacion')
            ->orderByDesc('valoraciones_avg_puntuacion')
            ->limit(5)
            ->get();
    }

    private function formatViewpoints($miradores, ?array $coordsRef): array
    {
        return $miradores->map(function ($mirador) use ($coordsRef) {
            $item = [
                'id'               => $mirador->id,
                'nombre'           => $mirador->nombre,
                'descripcion'      => mb_substr($mirador->descripcion ?? '', 0, 120),
                'provincia'        => $mirador->provincia->nombre ?? 'No especificada',
                'latitud'          => (float) $mirador->latitud,
                'longitud'         => (float) $mirador->longitud,
                'valoracion_media' => round((float) ($mirador->valoraciones_avg_puntuacion ?? 0), 1),
                'tags'             => $mirador->tags->pluck('nombre')->toArray(),
                'rutas'            => $mirador->rutas->map(fn($r) => [
                    'id'           => $r->id,
                    'nombre'       => $r->nombre,
                    'dificultad'   => $r->dificultad,
                    'distancia_km' => (float) ($r->distancia_km ?? 0),
                ])->toArray(),
            ];

            if ($coordsRef) {
                $item['distancia_km'] = round(
                    $this->haversine($coordsRef[0], $coordsRef[1], $mirador->latitud, $mirador->longitud),
                    1
                );
            }

            return $item;
        })->toArray();
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function buildNoResultsMessage(array $criteria): string
    {
        $partes = [];
        if (!empty($criteria['provincia'])) $partes[] = 'en ' . $criteria['provincia'];
        if (!empty($criteria['ciudad']))    $partes[] = 'cerca de ' . $criteria['ciudad'];
        if (!empty($criteria['tags']))      $partes[] = 'con etiquetas "' . implode(', ', $criteria['tags']) . '"';
        if (!empty($criteria['difficulty'])) $partes[] = 'de dificultad "' . implode(', ', $criteria['difficulty']) . '"';
        if (!empty($criteria['min_rating'])) $partes[] = 'con valoración mínima de ' . $criteria['min_rating'];

        $desc = !empty($partes) ? ' ' . implode(' y ', $partes) : '';
        return "No encontré miradores{$desc}. Prueba con criterios más amplios.";
    }

    private function getCiudadCoordinates(string $ciudad): ?array
    {
        return $this->getCiudadesMap()[$ciudad] ?? null;
    }

    private function getProvinciaCoordinates(string $provincia): ?array
    {
        return $this->getProvinciasMap()[$provincia] ?? null;
    }

    private function getProvinciasMap(): array
    {
        return [
            'Asturias'         => [43.3623, -5.8595],
            'Cantabria'        => [43.1828, -3.9878],
            'León'             => [42.5987, -5.5794],
            'Galicia'          => [42.5751, -8.1339],
            'Castilla y León'  => [41.6521, -4.7240],
            'País Vasco'       => [43.0000, -2.5000],
            'Navarra'          => [42.8169, -1.6440],
            'La Rioja'         => [42.2871, -2.5396],
            'Aragón'           => [41.5976, -0.9057],
            'Cataluña'         => [41.5912,  1.5209],
            'Madrid'           => [40.4168, -3.7038],
            'Castilla-La Mancha' => [39.8621, -3.0049],
            'Extremadura'      => [39.4937, -6.0679],
            'Andalucía'        => [37.5443, -4.7278],
            'Murcia'           => [37.9922, -1.1307],
            'Valencia'         => [39.4840, -0.7533],
            'Baleares'         => [39.5696,  2.6502],
            'Canarias'         => [28.2916, -16.6291],
            'Palencia'         => [42.0108, -4.7447],
            'Burgos'           => [42.3604, -3.6910],
            'Soria'            => [41.7660, -2.4734],
            'Valladolid'       => [41.6523, -4.7245],
        ];
    }

    private function getCiudadesMap(): array
    {
        return [
            'Oviedo'     => [43.3603, -5.8494],
            'Gijón'      => [43.5453, -5.6619],
            'Avilés'     => [43.1234, -5.9256],
            'Santander'  => [43.4623, -3.8099],
            'Bilbao'     => [43.2630, -2.9349],
            'San Sebastián' => [43.3183, -1.9812],
            'León'       => [42.5987, -5.5794],
            'Santiago'   => [42.8782, -8.5448],
            'Madrid'     => [40.4168, -3.7038],
            'Toledo'     => [39.8581, -4.0201],
            'Barcelona'  => [41.3851,  2.1734],
            'Valencia'   => [39.4699, -0.3763],
            'Sevilla'    => [37.3886, -5.9823],
            'Málaga'     => [36.7213, -4.4214],
            'Granada'    => [37.1773, -3.5986],
            'Zaragoza'   => [41.6488, -0.8891],
            'Pamplona'   => [42.8169, -1.6440],
            'Logroño'    => [42.4650, -2.4456],
            'Burgos'     => [42.3437, -3.6966],
            'Salamanca'  => [40.9701, -5.6635],
            'Valladolid' => [41.6523, -4.7245],
        ];
    }

    private function errorResponse(string $message): array
    {
        return [
            'success'    => false,
            'message'    => $message,
            'viewpoints' => [],
            'count'      => 0,
        ];
    }
}
