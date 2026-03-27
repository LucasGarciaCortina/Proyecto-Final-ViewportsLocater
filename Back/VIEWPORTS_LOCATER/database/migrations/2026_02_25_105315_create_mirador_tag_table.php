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
        Schema::create('mirador_tag', function (Blueprint $table) {
            $table->foreignId('mirador_id');
            $table->foreignId('tag_id');
            $table->foreign('mirador_id')->references('id')->on('miradores')->onDelete('cascade');
            $table->foreign('tag_id')->references('id')->on('tags')->onDelete('cascade');
            $table->primary(array('mirador_id','tag_id'));
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mirador_tag');
    }
};
