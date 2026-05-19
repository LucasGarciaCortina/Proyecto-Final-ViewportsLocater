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

            $table->decimal('latitud', 9, 6);
            $table->decimal('longitud', 9, 6);

            $table->timestamps();

            $table->foreignId('provincia_id')
              ->constrained('provincias')
              ->restrictOnDelete();

            $table->foreignId('user_id')
              ->constrained('users')
              ->onDelete('cascade');

            $table->index(['latitud', 'longitud']);
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
