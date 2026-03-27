<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('rutas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();

            $table->decimal('distancia_km', 6, 2)->nullable();
            $table->unsignedInteger('duracion_estimada_min')->nullable();

            $table->string('dificultad', 30)->nullable();

            $table->string('enlace_maps', 500)->nullable();
            $table->string('gpx_url', 500)->nullable();
            $table->timestamps();

            $table->foreignId('mirador_id')
              ->constrained('miradores')
              ->onDelete('cascade');

            $table->foreignId('user_id')
              ->constrained('users')
              ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rutas');
    }
};
