<?php

namespace App\Swagger\Endpoints;

use OpenApi\Attributes as OA;

class TagEndpoints
{
    #[OA\Get(
        path: '/api/tags',
        operationId: 'getTags',
        summary: 'Listar todos los tags',
        tags: ['Tags'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de tags ordenados por nombre',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Tag')
                )
            )
        ]
    )]
    public function index() {}
}
