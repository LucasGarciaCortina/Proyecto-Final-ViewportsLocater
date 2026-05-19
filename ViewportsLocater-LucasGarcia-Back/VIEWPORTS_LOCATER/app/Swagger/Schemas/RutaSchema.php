<?php

namespace App\Swagger\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Ruta',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'nombre', type: 'string', example: 'Ruta del Pico Mayor'),
        new OA\Property(property: 'descripcion', type: 'string', nullable: true, example: 'Ruta de montaña con vistas panorámicas'),
        new OA\Property(property: 'distancia_km', type: 'number', format: 'float', nullable: true, example: 12.5),
        new OA\Property(property: 'duracion_estimada_min', type: 'integer', nullable: true, example: 180),
        new OA\Property(property: 'dificultad', type: 'string', nullable: true, example: 'Media'),
        new OA\Property(property: 'enlace_maps', type: 'string', nullable: true, example: 'https://maps.google.com/...'),
        new OA\Property(property: 'gpx_url', type: 'string', nullable: true, example: 'https://ejemplo.com/ruta.gpx'),
        new OA\Property(property: 'mirador_id', type: 'integer', example: 1),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class RutaSchema {}
