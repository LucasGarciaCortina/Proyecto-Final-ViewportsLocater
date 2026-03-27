<?php

namespace Database\Factories;

use App\Models\Mirador;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Foto>
 */
class FotoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'url' => $this->faker->imageUrl(),
            'fecha_subida' => now(),
            'mirador_id' => Mirador::inRandomOrder()->first()->id ?? Mirador::factory(),
            'user_id' => User::query()->inRandomOrder()->value('id') ?? User::factory(),
        ];
    }
}
