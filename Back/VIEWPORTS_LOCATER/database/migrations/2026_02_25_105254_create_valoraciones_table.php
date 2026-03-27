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
            $table->foreignId('user_id');
            $table->foreignId('mirador_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('mirador_id')->references('id')->on('miradores')->onDelete('cascade');
            $table->primary(array('user_id', 'mirador_id'));
            $table->integer('puntuacion');
            $table->text('comentario')->nullable();

            $table->timestamps();
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
