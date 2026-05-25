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
        Schema::create('fotos', function (Blueprint $table) {
            $table->id();

            $table->string('url', 500);
            $table->timestamp('fecha_subida')->useCurrent(); // se rellena automáticamente con la fecha y hora actual al insertar
            $table->timestamps();

            $table->foreignId('mirador_id')->constrained('miradores')->onDelete('cascade'); // si se elimina el mirador, se eliminan también sus fotos
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');        // si se elimina el usuario, se eliminan también sus fotos
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fotos');
    }
};
