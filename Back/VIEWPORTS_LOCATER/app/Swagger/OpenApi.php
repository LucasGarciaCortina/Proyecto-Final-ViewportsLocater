<?php

namespace App\Swagger;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Viewports Locater API',
    description: 'Documentacion de la API'
)]
#[OA\Server(
    url: 'http://localhost:8000',
    description: 'Servidor local'
)]
class OpenApi
{
}
