<?php

namespace App\Swagger\Endpoints;

use OpenApi\Attributes as OA;

class FotoEndpoints
{
    #[OA\Get(
        path: '/api/fotos',
        operationId: 'getFotos',
        summary: 'Listar todas las fotos',
        tags: ['Fotos'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de fotos',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Foto')
                )
            )
        ]
    )]
    public function index() {}

    #[OA\Post(
        path: '/api/fotos',
        operationId: 'storeFoto',
        summary: 'Crear una nueva foto',
        tags: ['Fotos'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['url', 'mirador_id'],
                properties: [
                    new OA\Property(property: 'url', type: 'string', maxLength: 500, example: 'https://ejemplo.com/foto.jpg'),
                    new OA\Property(property: 'fecha_subida', type: 'string', format: 'date', nullable: true, example: '2024-06-15'),
                    new OA\Property(property: 'mirador_id', type: 'integer', example: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Foto creada correctamente',
                content: new OA\JsonContent(ref: '#/components/schemas/Foto')
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function store() {}

    #[OA\Get(
        path: '/api/fotos/{id}',
        operationId: 'showFoto',
        summary: 'Obtener una foto por ID',
        tags: ['Fotos'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Datos de la foto',
                content: new OA\JsonContent(ref: '#/components/schemas/Foto')
            ),
            new OA\Response(response: 404, description: 'Foto no encontrada')
        ]
    )]
    public function show() {}

    #[OA\Put(
        path: '/api/fotos/{id}',
        operationId: 'updateFoto',
        summary: 'Actualizar una foto existente',
        tags: ['Fotos'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'url', type: 'string', maxLength: 500, example: 'https://ejemplo.com/nueva-foto.jpg'),
                    new OA\Property(property: 'fecha_subida', type: 'string', format: 'date', nullable: true, example: '2024-07-01'),
                    new OA\Property(property: 'mirador_id', type: 'integer', example: 2),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Foto actualizada correctamente',
                content: new OA\JsonContent(ref: '#/components/schemas/Foto')
            ),
            new OA\Response(response: 404, description: 'Foto no encontrada'),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function update() {}

    #[OA\Delete(
        path: '/api/fotos/{id}',
        operationId: 'destroyFoto',
        summary: 'Eliminar una foto',
        tags: ['Fotos'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Foto eliminada correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Foto eliminada correctamente')
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Foto no encontrada')
        ]
    )]
    public function destroy() {}

    #[OA\Get(
        path: '/api/miradores/{mirador}/fotos',
        operationId: 'getFotosPorMirador',
        summary: 'Listar fotos de un mirador',
        tags: ['Fotos'],
        parameters: [
            new OA\Parameter(name: 'mirador', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de fotos del mirador',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Foto')
                )
            ),
            new OA\Response(response: 404, description: 'Mirador no encontrado')
        ]
    )]
    public function FotoPorMirador() {}
}
