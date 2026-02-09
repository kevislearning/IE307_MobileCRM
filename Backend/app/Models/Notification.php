<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    // Các loại thông báo
    public const TYPE_LEAD = 'LEAD';
    public const TYPE_TASK = 'TASK';
    public const TYPE_SYSTEM = 'SYSTEM';
    public const TYPE_TASK_ASSIGNED = 'TASK_ASSIGNED';
    public const TYPE_LEAD_ASSIGNED = 'LEAD_ASSIGNED';
    public const TYPE_NO_FOLLOW_UP = 'NO_FOLLOW_UP';
    public const TYPE_TASK_OVERDUE = 'TASK_OVERDUE';
    public const TYPE_TASK_REMINDER = 'TASK_REMINDER';
    public const TYPE_OPPORTUNITY_STAGE = 'OPPORTUNITY_STAGE';
    public const TYPE_DEAL_WON = 'DEAL_WON';
    public const TYPE_DEAL_LOST = 'DEAL_LOST';
    public const TYPE_STATUS_CHANGE = 'STATUS_CHANGE';

    protected $fillable = [
        'type', 'content', 'title', 'body', 'payload', 'is_read', 'user_id'
    ];

    protected $casts = [
        'payload' => 'array',
        'is_read' => 'bool',
    ];

    protected $appends = ['type_label'];

    /**
     * Lấy user sở hữu thông báo này.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Lấy nhãn loại thông báo bằng tiếng Việt.
     */
    public function getTypeLabelAttribute(): string
    {
        $labels = [
            self::TYPE_LEAD => 'Khách hàng',
            self::TYPE_TASK => 'Công việc',
            self::TYPE_SYSTEM => 'Hệ thống',
            self::TYPE_TASK_ASSIGNED => 'Task được giao',
            self::TYPE_LEAD_ASSIGNED => 'Khách hàng được giao',
            self::TYPE_NO_FOLLOW_UP => 'Cảnh báo chưa liên hệ',
            self::TYPE_TASK_OVERDUE => 'Task trễ hạn',
            self::TYPE_TASK_REMINDER => 'Nhắc nhở Task',
            self::TYPE_OPPORTUNITY_STAGE => 'Cập nhật giai đoạn',
            self::TYPE_DEAL_WON => 'Chốt thành công',
            self::TYPE_DEAL_LOST => 'Thất bại',
            self::TYPE_STATUS_CHANGE => 'Thay đổi trạng thái',
        ];

        return $labels[$this->type] ?? $this->type;
    }
}
