<?php

namespace Database\Factories;

use App\Models\Provincia;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Mirador>
 */
class MiradorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => $this->faker->unique()->sentence(3),
            'descripcion' => $this->faker->paragraph(),
            'latitud' => $this->faker->latitude(),
            'longitud' => $this->faker->longitude(),
            'provincia_id' => Provincia::inRandomOrder()->first()->id ?? Provincia::factory(),
            'user_id' => User::query()->inRandomOrder()->value('id') ?? User::factory(),
        ];
    }
}
