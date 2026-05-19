<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Mirador;
use App\Models\Tag;

class MiradorTagSeeder extends Seeder
{
    public function run(): void
    {
        $tagIds = Tag::pluck('id')->all();

        if (count($tagIds) === 0) return;

        // Limpia la tabla pivot para no duplicar
        DB::table('mirador_tag')->truncate();

        Mirador::all()->each(function ($mirador) use ($tagIds) {
            shuffle($tagIds);
            $take = rand(2, 4); // 2 a 4 tags por mirador
            $selected = array_slice($tagIds, 0, $take);

            // Insert en pivot
            foreach ($selected as $tagId) {
                DB::table('mirador_tag')->insert([
                    'mirador_id' => $mirador->id,
                    'tag_id' => $tagId,
                ]);
            }
        });
    }
}
