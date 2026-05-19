<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TagsSeeder extends Seeder
{
    public function run(): void
    {
        $tags = [
            'Accesible', 'Montaña', 'Costa', 'Bosque', 'Valle',
            'Urbano', 'Rural', 'Cascada', 'Lago', 'Río',
            'Apto para niños', 'Parking cercano', 'Zona de picnic',
            'Difícil acceso', 'Sendero señalizado', 'Vista al mar',
            'Vista a la ciudad', 'Amanecer', 'Atardecer', 'Panorámico',
        ];

        foreach ($tags as $nombre) {
            DB::table('tags')->insertOrIgnore(['nombre' => $nombre]);
        }
    }
}
