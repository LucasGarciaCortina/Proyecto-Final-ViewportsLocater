<?php

namespace Database\Seeders;

use App\Models\Foto;
use App\Models\Mirador;
use App\Models\Provincia;
use App\Models\Ruta;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        Provincia::factory(5)->create();
        Mirador::factory(20)->create();
        Ruta::factory(40)->create();
        Foto::factory(60)->create();
        $this->call(TagSeeder::class);
        $this->call(MiradorTagSeeder::class);
    }
}
