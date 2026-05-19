<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rutas', function (Blueprint $table) {
            if (!Schema::hasColumn('rutas', 'desnivel')) {
                $table->integer('desnivel')->nullable()->after('duracion_estimada_min');
            }
        });
    }

    public function down(): void
    {
        Schema::table('rutas', function (Blueprint $table) {
            if (Schema::hasColumn('rutas', 'desnivel')) {
                $table->dropColumn('desnivel');
            }
        });
    }
};
