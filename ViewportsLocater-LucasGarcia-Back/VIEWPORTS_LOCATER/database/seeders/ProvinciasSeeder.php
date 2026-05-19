<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProvinciasSeeder extends Seeder
{
    public function run(): void
    {
        $provincias = [
            'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias',
            'Ávila', 'Badajoz', 'Barcelona', 'Burgos', 'Cáceres',
            'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba',
            'La Coruña', 'Cuenca', 'Gerona', 'Granada', 'Guadalajara',
            'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares', 'Jaén',
            'León', 'Lérida', 'Lugo', 'Madrid', 'Málaga',
            'Murcia', 'Navarra', 'Orense', 'Palencia', 'Las Palmas',
            'Pontevedra', 'La Rioja', 'Salamanca', 'Segovia', 'Sevilla',
            'Soria', 'Tarragona', 'Santa Cruz de Tenerife', 'Teruel', 'Toledo',
            'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza',
            'Ceuta', 'Melilla',
        ];

        foreach ($provincias as $nombre) {
            DB::table('provincias')->insertOrIgnore(['nombre' => $nombre]);
        }
    }
}
