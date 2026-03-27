<?php

namespace App\Swagger\Endpoints;

use OpenApi\Attributes as OA;

class ProvinciaEndpoints
{
    #[OA\Get(
        path: '/api/provincias',
        operationId: 'getProvincias',
        summary: 'Listar todas las provincias',
        tags: ['Provincias'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de provincias ordenadas por nombre',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Provincia')
                )
            )
        ]
    )]
    public function index() {}

    #[OA\Post(
        path: '/api/provincias',
        operationId: 'storeProvincia',
        summary: 'Crear una nueva provincia',
        tags: ['Provincias'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['nombre'],
                properties: [
                    new OA\Property(property: 'nombre', type: 'string', maxLength: 100, example: 'Barcelona'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Provincia creada correctamente',
                content: new OA\JsonContent(ref: '#/components/schemas/Provincia')
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function store() {}

    #[OA\Get(
        path: '/api/provincias/{id}',
        operationId: 'showProvincia',
        summary: 'Obtener una provincia por ID',
        tags: ['Provincias'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Datos de la provincia',
                content: new OA\JsonContent(ref: '#/components/schemas/Provincia')
            ),
            new OA\Response(response: 404, description: 'Provincia no encontrada')
        ]
    )]
    public function show() {}

    #[OA\Put(
        path: '/api/provincias/{id}',
        operationId: 'updateProvincia',
        summary: 'Actualizar una provincia existente',
        tags: ['Provincias'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['nombre'],
                properties: [
                    new OA\Property(property: 'nombre', type: 'string', maxLength: 100, example: 'Girona'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Provincia actualizada correctamente',
                content: new OA\JsonContent(ref: '#/components/schemas/Provincia')
            ),
            new OA\Response(response: 404, description: 'Provincia no encontrada'),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function update() {}

    #[OA\Delete(
        path: '/api/provincias/{id}',
        operationId: 'destroyProvincia',
        summary: 'Eliminar una provincia',
        tags: ['Provincias'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Provincia eliminada correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Provincia eliminada correctamente')
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Provincia no encontrada')
        ]
    )]
    public function destroy() {}
}
