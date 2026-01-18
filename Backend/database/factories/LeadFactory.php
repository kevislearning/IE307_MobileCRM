<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LeadFactory extends Factory
{
    protected $model = Lead::class;

    public function definition(): array
    {
        return [
            'full_name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone_number' => $this->faker->phoneNumber(),
            'company' => $this->faker->company(),
            'status' => $this->faker->randomElement([
                Lead::STATUS_NEW,
                Lead::STATUS_CONTACTING,
                Lead::STATUS_AGREEMENT,
                Lead::STATUS_LOST
            ]),
            'owner_id' => User::factory(),
            'unread_by_owner' => $this->faker->boolean(),
        ];
    }
}
