<?php

namespace App\Swagger\Endpoints;

use OpenApi\Attributes as OA;

class RutaEndpoints
{
    #[OA\Get(
        path: '/api/rutas',
        operationId: 'getRutas',
        summary: 'Listar todas las rutas',
        tags: ['Rutas'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de rutas',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Ruta')
                )
            )
        ]
    )]
    public function index() {}

    #[OA\Post(
        path: '/api/rutas',
        operationId: 'storeRuta',
        summary: 'Crear una nueva ruta',
        tags: ['Rutas'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['nombre', 'mirador_id'],
                properties: [
                    new OA\Property(property: 'nombre', type: 'string', maxLength: 150, example: 'Ruta del Pico Mayor'),
                    new OA\Property(property: 'descripcion', type: 'string', nullable: true, example: 'Ruta de montaña con vistas panorámicas'),
                    new OA\Property(property: 'distancia_km', type: 'number', format: 'float', nullable: true, example: 12.5),
                    new OA\Property(property: 'duracion_estimada_min', type: 'integer', nullable: true, example: 180),
                    new OA\Property(property: 'dificultad', type: 'string', maxLength: 30, nullable: true, example: 'Media'),
                    new OA\Property(property: 'enlace_maps', type: 'string', maxLength: 500, nullable: true, example: 'https://maps.google.com/...'),
                    new OA\Property(property: 'gpx_url', type: 'string', maxLength: 500, nullable: true, example: 'https://ejemplo.com/ruta.gpx'),
                    new OA\Property(property: 'mirador_id', type: 'integer', example: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Ruta creada correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ruta', ref: '#/components/schemas/Ruta'),
                        new OA\Property(property: 'mirador', ref: '#/components/schemas/Mirador'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function store() {}

    #[OA\Get(
        path: '/api/rutas/{id}',
        operationId: 'showRuta',
        summary: 'Obtener una ruta por ID',
        tags: ['Rutas'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Datos de la ruta',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ruta', ref: '#/components/schemas/Ruta'),
                        new OA\Property(property: 'mirador', ref: '#/components/schemas/Mirador'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Ruta no encontrada')
        ]
    )]
    public function show() {}

    #[OA\Put(
        path: '/api/rutas/{id}',
        operationId: 'updateRuta',
        summary: 'Actualizar una ruta existente',
        tags: ['Rutas'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'nombre', type: 'string', maxLength: 150, example: 'Ruta del Pico Mayor'),
                    new OA\Property(property: 'descripcion', type: 'string', nullable: true, example: 'Descripción actualizada'),
                    new OA\Property(property: 'distancia_km', type: 'number', format: 'float', nullable: true, example: 15.0),
                    new OA\Property(property: 'duracion_estimada_min', type: 'integer', nullable: true, example: 200),
                    new OA\Property(property: 'dificultad', type: 'string', maxLength: 30, nullable: true, example: 'Alta'),
                    new OA\Property(property: 'enlace_maps', type: 'string', maxLength: 500, nullable: true, example: 'https://maps.google.com/...'),
                    new OA\Property(property: 'gpx_url', type: 'string', maxLength: 500, nullable: true, example: 'https://ejemplo.com/ruta-nueva.gpx'),
                    new OA\Property(property: 'mirador_id', type: 'integer', example: 2),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Ruta actualizada correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ruta', ref: '#/components/schemas/Ruta'),
                        new OA\Property(property: 'mirador', ref: '#/components/schemas/Mirador'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Ruta no encontrada'),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function update() {}

    #[OA\Delete(
        path: '/api/rutas/{id}',
        operationId: 'destroyRuta',
        summary: 'Eliminar una ruta',
        tags: ['Rutas'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Ruta eliminada correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Ruta eliminada correctamente')
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Ruta no encontrada')
        ]
    )]
    public function destroy() {}

    #[OA\Get(
        path: '/api/miradores/{mirador}/rutas',
        operationId: 'getRutasPorMirador',
        summary: 'Listar rutas de un mirador',
        tags: ['Rutas'],
        parameters: [
            new OA\Parameter(name: 'mirador', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de rutas del mirador',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Ruta')
                )
            ),
            new OA\Response(response: 404, description: 'Mirador no encontrado')
        ]
    )]
    public function RutaPorMirador() {}
}
