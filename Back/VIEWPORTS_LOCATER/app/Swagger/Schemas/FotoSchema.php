<?php

namespace App\Swagger\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Foto',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'url', type: 'string', example: 'https://ejemplo.com/foto.jpg'),
        new OA\Property(property: 'fecha_subida', type: 'string', format: 'date', nullable: true, example: '2024-06-15'),
        new OA\Property(property: 'mirador_id', type: 'integer', example: 1),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class FotoSchema {}
