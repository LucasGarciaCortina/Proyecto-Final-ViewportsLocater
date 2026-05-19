<?php

namespace App\Swagger\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Mirador',
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'nombre', type: 'string', example: 'Mirador del Tibidabo'),
        new OA\Property(property: 'descripcion', type: 'string', nullable: true, example: 'Vistas panorámicas de Barcelona'),
        new OA\Property(property: 'latitud', type: 'number', format: 'float', example: 41.4236),
        new OA\Property(property: 'longitud', type: 'number', format: 'float', example: 2.1197),
        new OA\Property(property: 'provincia_id', type: 'integer', example: 1),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class MiradorSchema {}
