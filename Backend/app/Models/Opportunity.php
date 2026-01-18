<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Opportunity extends Model
{
    protected $fillable = [
        'lead_id','stage','probability','estimated_value','expected_revenue','currency_code',
        'expected_close_date','next_step','decision_criteria','competitor','stage_updated_at','owner_id'
    ];

    protected $casts = [
        'expected_close_date' => 'date',
        'stage_updated_at' => 'datetime',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class);
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function lineItems()
    {
        return $this->hasMany(OpportunityLineItem::class);
    }

    public function stageHistories()
    {
        return $this->hasMany(OpportunityStageHistory::class);
    }

    public function scopeSearch($query, $term)
    {
        if (!$term) return;
        $term = "%$term%";
        $query->whereHas('lead', function($q) use ($term) {
            $q->where('full_name', 'like', $term);
        });
    }
}
