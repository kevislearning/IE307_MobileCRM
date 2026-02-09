<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use HasFactory;

    // Status constants theo States.txt
    // 1. Lead mới → 2. Đã liên hệ → 3. Quan tâm → 4. Có nhu cầu → 5. Đã mua → 6. Không nhu cầu
    public const STATUS_LEAD_NEW = 'LEAD_NEW';       // Chưa có tương tác
    public const STATUS_CONTACTED = 'CONTACTED';     // Đã có phản hồi, chưa rõ nhu cầu
    public const STATUS_INTERESTED = 'INTERESTED';   // Quan tâm, đang chăm sóc, cần follow-up
    public const STATUS_QUALIFIED = 'QUALIFIED';     // Có nhu cầu (yêu cầu báo giá, hẹn demo) ⚠️ Quan trọng
    public const STATUS_WON = 'WON';                 // Đã mua, deal chốt
    public const STATUS_LOST = 'LOST';               // Không có nhu cầu, từ chối

    // Hằng số kích thước công ty để tính giá trị tiềm năng
    public const COMPANY_SIZE_SMALL = 'small';
    public const COMPANY_SIZE_MEDIUM = 'medium';
    public const COMPANY_SIZE_ENTERPRISE = 'enterprise';

    // Hằng số mức giá trị tiềm năng
    public const POTENTIAL_LOW = 'low';
    public const POTENTIAL_MEDIUM = 'medium';
    public const POTENTIAL_HIGH = 'high';

    // Giá trị cơ sở để tính giá trị tiềm năng (VNĐ)
    public const POTENTIAL_BASE_VALUES = [
        'small' => 50000000,      // 50 triệu
        'medium' => 200000000,    // 200 triệu
        'enterprise' => 1000000000, // 1 tỷ
    ];

    // Hệ số ngành nghề
    public const INDUSTRY_FACTORS = [
        'education' => 1.0,
        'retail' => 1.2,
        'finance' => 1.5,
        'technology' => 2.0,
        'healthcare' => 1.3,
        'manufacturing' => 1.4,
        'other' => 1.0,
    ];

    protected $fillable = [
        'full_name','email','phone_number','phone_secondary','website','company','company_size','industry',
        'budget','potential_value_level','potential_value_amount','address','note','last_contact_at','source',
        'score','priority','source_detail','campaign','custom_fields',
        'status','owner_id','assigned_to','assigned_by','assigned_at','last_activity_at','unread_by_owner','team_id'
    ];

    protected $casts = [
        'unread_by_owner' => 'bool',
        'assigned_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'last_contact_at' => 'datetime',
        'last_follow_up_notified_at' => 'datetime',
        'custom_fields' => 'array',
        'potential_value_amount' => 'integer',
    ];

    protected $appends = ['potential_value_display', 'days_since_contact'];

    /**
     * Tính toán và trả về giá trị tiềm năng dựa trên kích thước công ty và ngành nghề
     */
    public function calculatePotentialValue(): array
    {
        if (!$this->company_size) {
            return ['level' => null, 'amount' => null];
        }

        $baseValue = self::POTENTIAL_BASE_VALUES[$this->company_size] ?? 50000000;
        $industryFactor = self::INDUSTRY_FACTORS[$this->industry] ?? 1.0;
        
        $amount = (int) ($baseValue * $industryFactor);
        
        // Xác định mức dựa trên số tiền
        if ($amount < 100000000) {
            $level = 'low';
        } elseif ($amount <= 500000000) {
            $level = 'medium';
        } else {
            $level = 'high';
        }
        
        return ['level' => $level, 'amount' => $amount];
    }

    /**
     * Tự động cập nhật giá trị tiềm năng khi company_size hoặc industry thay đổi
     */
    protected static function booted(): void
    {
        static::saving(function (Lead $lead) {
            if ($lead->isDirty(['company_size', 'industry'])) {
                $potentialValue = $lead->calculatePotentialValue();
                $lead->potential_value_level = $potentialValue['level'];
                $lead->potential_value_amount = $potentialValue['amount'];
            }
        });
    }

    /**
     * Lấy giá trị tiềm năng đã định dạng để hiển thị trên frontend
     */
    public function getPotentialValueDisplayAttribute(): ?array
    {
        if (!$this->potential_value_level) {
            return null;
        }

        $labels = [
            'low' => ['label' => 'Thấp', 'range' => '< 100M'],
            'medium' => ['label' => 'Trung bình', 'range' => '100–500M'],
            'high' => ['label' => 'Cao', 'range' => '> 500M'],
        ];

        return [
            'level' => $this->potential_value_level,
            'label' => $labels[$this->potential_value_level]['label'] ?? 'N/A',
            'range' => $labels[$this->potential_value_level]['range'] ?? '',
            'amount' => $this->potential_value_amount,
        ];
    }

    /**
     * Lấy số ngày kể từ lần liên hệ cuối cùng
     */
    public function getDaysSinceContactAttribute(): ?int
    {
        if (!$this->last_contact_at) {
            return null;
        }
        return now()->diffInDays($this->last_contact_at);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function scopeSearch($query, $term)
    {
        if (!$term) return;
        $term = "%$term%";
        $query->where(function($q) use ($term) {
            $q->where('full_name', 'like', $term)
              ->orWhere('email', 'like', $term)
              ->orWhere('company', 'like', $term)
              ->orWhere('phone_number', 'like', $term);
        });
    }
}
