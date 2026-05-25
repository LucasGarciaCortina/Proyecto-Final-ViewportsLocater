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
        Schema::create('valoraciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');     // si se elimina el usuario, se eliminan también sus valoraciones
            $table->foreignId('mirador_id')->constrained('miradores')->onDelete('cascade'); // si se elimina el mirador, se eliminan también sus valoraciones
            $table->integer('puntuacion'); // valor entero esperado entre 1 y 5, validado en el controlador
            $table->text('comentario')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'mirador_id']); // garantiza que un usuario solo puede tener una valoración por mirador
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('valoraciones');
    }
};
