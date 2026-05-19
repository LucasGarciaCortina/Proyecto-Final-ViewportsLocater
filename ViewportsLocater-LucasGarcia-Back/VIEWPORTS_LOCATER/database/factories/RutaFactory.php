<?php

namespace Database\Factories;

use App\Models\Mirador;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Ruta>
 */
class RutaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => $this->faker->sentence(2),
            'descripcion' => $this->faker->paragraph(),
            'distancia_km' => $this->faker->randomFloat(2, 1, 20),
            'duracion_estimada_min' => $this->faker->numberBetween(30, 240),
            'dificultad' => $this->faker->randomElement(['Fácil', 'Media', 'Difícil']),
            'enlace_maps' => $this->faker->url(),
            'gpx_url' => $this->faker->url(),
            'mirador_id' => Mirador::inRandomOrder()->first()->id ?? Mirador::factory(),
            'user_id' => User::query()->inRandomOrder()->value('id') ?? User::factory(),
        ];
    }
}
