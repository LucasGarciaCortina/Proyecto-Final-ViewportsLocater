<?php
require 'vendor/autoload.php';

$o = \OpenApi\Generator::scan([
    'app/Swagger',
    'app/Http/Controllers'
]);

echo json_encode(json_decode($o->toJson()), JSON_PRETTY_PRINT);
