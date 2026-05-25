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

            $table->decimal('distancia_km', 6, 2)->nullable();   // hasta 9999.99 km, nullable porque puede calcularse del GPX
            $table->integer('desnivel')->nullable();              // desnivel acumulado en metros, nullable si no se conoce
            $table->unsignedInteger('duracion_estimada_min')->nullable(); // duración en minutos, sin signo porque no puede ser negativa

            $table->string('dificultad', 30)->nullable(); // valores esperados: 'facil', 'media', 'dificil'

            $table->string('enlace_maps', 500)->nullable(); // URL externa a Google Maps u similar
            $table->string('gpx_url', 500)->nullable();     // URL pública del fichero GPX almacenado en el servidor
            $table->timestamps();

            $table->foreignId('mirador_id')
              ->constrained('miradores')
              ->onDelete('cascade'); // si se elimina el mirador, se eliminan también sus rutas

            $table->foreignId('user_id')
              ->constrained('users')
              ->onDelete('cascade'); // si se elimina el usuario, se eliminan también sus rutas
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
