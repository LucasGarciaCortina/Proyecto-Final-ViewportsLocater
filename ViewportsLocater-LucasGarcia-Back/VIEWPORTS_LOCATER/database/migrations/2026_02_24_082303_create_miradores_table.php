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
        Schema::create('miradores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();

            $table->decimal('latitud', 9, 6);  // 9 dígitos en total, 6 decimales: precisión suficiente para coordenadas GPS (~1 metro)
            $table->decimal('longitud', 9, 6);

            $table->timestamps();

            $table->foreignId('provincia_id')
              ->constrained('provincias')
              ->restrictOnDelete(); // impide eliminar una provincia si tiene miradores asociados

            $table->foreignId('user_id')
              ->constrained('users')
              ->onDelete('cascade'); // si se elimina el usuario, se eliminan también sus miradores

            $table->index(['latitud', 'longitud']); // índice compuesto para optimizar las consultas de búsqueda por coordenadas (Haversine)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('miradores');
    }
};
