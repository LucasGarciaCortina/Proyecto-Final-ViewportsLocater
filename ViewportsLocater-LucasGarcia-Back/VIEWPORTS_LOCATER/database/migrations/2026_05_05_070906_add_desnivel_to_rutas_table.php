<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Añade la columna 'desnivel' a la tabla 'rutas' si no existe.
     * Se usa hasColumn() como precaución para evitar errores si la migración
     * se ejecuta en un entorno donde la columna ya fue añadida manualmente.
     */
    public function up(): void
    {
        Schema::table('rutas', function (Blueprint $table) {
            if (!Schema::hasColumn('rutas', 'desnivel')) {
                $table->integer('desnivel')->nullable()->after('duracion_estimada_min'); // se inserta después de duracion_estimada_min para mantener el orden lógico de columnas
            }
        });
    }

    /**
     * Elimina la columna 'desnivel' de la tabla 'rutas' si existe.
     */
    public function down(): void
    {
        Schema::table('rutas', function (Blueprint $table) {
            if (Schema::hasColumn('rutas', 'desnivel')) {
                $table->dropColumn('desnivel');
            }
        });
    }
};
