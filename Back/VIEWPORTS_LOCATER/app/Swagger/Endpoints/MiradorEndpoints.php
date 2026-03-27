<?php

namespace App\Swagger\Endpoints;

use OpenApi\Attributes as OA;

class MiradorEndpoints
{
    #[OA\Get(
        path: '/api/miradores',
        operationId: 'getMiradores',
        summary: 'Listar todos los miradores',
        tags: ['Miradores'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de miradores con sus tags',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Mirador')
                )
            )
        ]
    )]
    public function index() {}

    #[OA\Get(
        path: '/api/miradores/buscar',
        operationId: 'buscarMiradorPorNombre',
        summary: 'Buscar miradores por nombre',
        tags: ['Miradores'],
        parameters: [
            new OA\Parameter(name: 'q', in: 'query', required: true, schema: new OA\Schema(type: 'string', minLength: 1, maxLength: 150), example: 'Tibidabo')
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores que coinciden con la búsqueda',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function buscarPorNombre() {}

    #[OA\Post(
        path: '/api/miradores/tags',
        operationId: 'getMiradoresPorTags',
        summary: 'Filtrar miradores por tags (debe tener TODOS los tags indicados)',
        tags: ['Miradores'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['tags'],
                properties: [
                    new OA\Property(
                        property: 'tags',
                        type: 'array',
                        items: new OA\Items(type: 'integer'),
                        example: [1, 2]
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores que tienen todos los tags indicados',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function MiradorPorTags() {}

    #[OA\Get(
        path: '/api/miradores/provincia/{provincia}',
        operationId: 'getMiradoresPorProvincia',
        summary: 'Listar miradores de una provincia',
        tags: ['Miradores'],
        parameters: [
            new OA\Parameter(name: 'provincia', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores de la provincia indicada',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            ),
            new OA\Response(response: 404, description: 'Provincia no encontrada')
        ]
    )]
    public function MiradorPorProvincia() {}

    #[OA\Get(
        path: '/api/miradores/dificultad/{dificultad}',
        operationId: 'getMiradoresPorDificultad',
        summary: 'Listar miradores filtrados por dificultad de sus rutas',
        tags: ['Miradores'],
        parameters: [
            new OA\Parameter(name: 'dificultad', in: 'path', required: true, schema: new OA\Schema(type: 'string', enum: ['facil', 'media', 'dificil']), example: 'media')
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores con rutas de la dificultad indicada',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            )
        ]
    )]
    public function MiradorPorDificultad() {}

    #[OA\Post(
        path: '/api/miradores/radio',
        operationId: 'getMiradoresPorRadio',
        summary: 'Listar miradores dentro de un radio (km) desde una coordenada',
        tags: ['Miradores'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['latitud', 'longitud', 'radio'],
                properties: [
                    new OA\Property(property: 'latitud', type: 'number', format: 'float', example: 41.3851),
                    new OA\Property(property: 'longitud', type: 'number', format: 'float', example: 2.1734),
                    new OA\Property(property: 'radio', type: 'number', format: 'float', example: 50),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores dentro del radio indicado con su distancia',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function MiradorPorRadio() {}

    #[OA\Get(
        path: '/api/miradores/ordenar/valoracion',
        operationId: 'getMiradoresOrdenadosPorValoracion',
        summary: 'Listar miradores ordenados por valoración media',
        tags: ['Miradores'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores ordenados de mayor a menor valoración media',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            )
        ]
    )]
    public function OrdenarPorValoracion() {}

    #[OA\Post(
        path: '/api/miradores/ordenar/cercano',
        operationId: 'getMiradoresOrdenadosPorCercano',
        summary: 'Listar miradores ordenados por distancia desde una coordenada',
        tags: ['Miradores'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['latitud', 'longitud'],
                properties: [
                    new OA\Property(property: 'latitud', type: 'number', format: 'float', example: 41.3851),
                    new OA\Property(property: 'longitud', type: 'number', format: 'float', example: 2.1734),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores ordenados de más cercano a más lejano',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function OrdenarPorCercano() {}

    #[OA\Get(
        path: '/api/miradores/ordenar/nombre',
        operationId: 'getMiradoresOrdenadosPorNombre',
        summary: 'Listar miradores ordenados alfabéticamente por nombre',
        tags: ['Miradores'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores ordenados por nombre',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            )
        ]
    )]
    public function OrdenarPorNombre() {}

    #[OA\Get(
        path: '/api/miradores/ordenar/dificultad',
        operationId: 'getMiradoresOrdenadosPorDificultad',
        summary: 'Listar miradores ordenados por dificultad de sus rutas',
        tags: ['Miradores'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Miradores ordenados de menor a mayor dificultad',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/Mirador'))
            )
        ]
    )]
    public function OrdenarPorDificultad() {}

    #[OA\Post(
        path: '/api/miradores',
        operationId: 'storeMirador',
        summary: 'Crear un nuevo mirador',
        tags: ['Miradores'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['nombre', 'latitud', 'longitud', 'provincia_id'],
                properties: [
                    new OA\Property(property: 'nombre', type: 'string', maxLength: 150, example: 'Mirador del Tibidabo'),
                    new OA\Property(property: 'descripcion', type: 'string', nullable: true, example: 'Vistas panorámicas de Barcelona'),
                    new OA\Property(property: 'latitud', type: 'number', format: 'float', example: 41.4236),
                    new OA\Property(property: 'longitud', type: 'number', format: 'float', example: 2.1197),
                    new OA\Property(property: 'provincia_id', type: 'integer', example: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mirador creado correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'mirador', ref: '#/components/schemas/Mirador'),
                        new OA\Property(property: 'provincia', ref: '#/components/schemas/Provincia'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function store() {}

    #[OA\Get(
        path: '/api/miradores/{id}',
        operationId: 'showMirador',
        summary: 'Obtener un mirador por ID',
        tags: ['Miradores'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Datos del mirador con provincia, rutas y fotos',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'mirador', ref: '#/components/schemas/Mirador'),
                        new OA\Property(property: 'provincia', ref: '#/components/schemas/Provincia'),
                        new OA\Property(property: 'rutas', type: 'array', items: new OA\Items(ref: '#/components/schemas/Ruta')),
                        new OA\Property(property: 'fotos', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Mirador no encontrado')
        ]
    )]
    public function show() {}

    #[OA\Put(
        path: '/api/miradores/{id}',
        operationId: 'updateMirador',
        summary: 'Actualizar un mirador existente',
        tags: ['Miradores'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'nombre', type: 'string', maxLength: 150, example: 'Mirador del Tibidabo'),
                    new OA\Property(property: 'descripcion', type: 'string', nullable: true, example: 'Descripción actualizada'),
                    new OA\Property(property: 'latitud', type: 'number', format: 'float', example: 41.4236),
                    new OA\Property(property: 'longitud', type: 'number', format: 'float', example: 2.1197),
                    new OA\Property(property: 'provincia_id', type: 'integer', example: 1),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mirador actualizado correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'mirador', ref: '#/components/schemas/Mirador'),
                        new OA\Property(property: 'provincia', ref: '#/components/schemas/Provincia'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Mirador no encontrado'),
            new OA\Response(response: 422, description: 'Error de validación')
        ]
    )]
    public function update() {}

    #[OA\Delete(
        path: '/api/miradores/{id}',
        operationId: 'destroyMirador',
        summary: 'Eliminar un mirador',
        tags: ['Miradores'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mirador eliminado correctamente',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Mirador eliminado correctamente')
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Mirador no encontrado')
        ]
    )]
    public function destroy() {}
}
