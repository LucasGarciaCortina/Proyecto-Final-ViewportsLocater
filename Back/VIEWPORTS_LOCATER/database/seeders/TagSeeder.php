<?php

namespace Database\Seeders;

use App\Models\Tag;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TagSeeder extends Seeder
{

    public function run(): void
    {
        $tags = [
            'Accesible',
            'Apto para niños',
            'Parking cercano',
            'Zona de picnic',
            'Admite mascotas',
            'Ruta corta',
            'Vista panorámica',
            'Punto fotográfico',
        ];

        foreach ($tags as $tag) {
            Tag::create(['nombre' => $tag]);
        }
    }
}
