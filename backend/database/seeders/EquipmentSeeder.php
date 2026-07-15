<?php

namespace Database\Seeders;

use App\Models\Equipment;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    public function run(): void
    {
        $equipmentNames = [
            'Marel line',
            'CO2 stunning system',
            'Clayton steam generator',
            'pilots',
            'flame sensors',
            'pumps',
            'chillers',
            'water treatment system',
        ];

        foreach ($equipmentNames as $name) {
            Equipment::query()->firstOrCreate([
                'name' => $name,
            ]);
        }
    }
}
