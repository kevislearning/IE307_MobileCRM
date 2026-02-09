// Các kiểu dữ liệu User
export type UserRole = "admin" | "owner" | "staff";

export interface User {
	id: number;
	name: string;
	email: string;
	phone?: string;
	avatar?: string;
	role: UserRole;
	must_change_password: boolean;
	notifications_enabled: boolean;
	language: "vi" | "en";
	theme: "light" | "dark" | "system";
	created_at: string;
	updated_at: string;
}

// Các kiểu dữ liệu Lead (Khách hàng)
// lead_new, contacted, interested, qualified, won, lost
export type LeadStatus = "LEAD_NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "WON" | "LOST";
export type LeadPriority = "LOW" | "MEDIUM" | "HIGH";
export type CompanySize = "small" | "medium" | "enterprise";
export type PotentialValueLevel = "low" | "medium" | "high";
export type Industry = "education" | "retail" | "finance" | "technology" | "healthcare" | "manufacturing" | "other";

export interface PotentialValueDisplay {
	level: PotentialValueLevel;
	label: string;
	range: string;
	amount: number | null;
}

export interface Lead {
	id: number;
	full_name: string;
	email?: string;
	phone_number?: string;
	phone_secondary?: string;
	website?: string;
	company?: string;
	company_size?: CompanySize;
	industry?: Industry;
	budget?: number;
	potential_value_level?: PotentialValueLevel;
	potential_value_amount?: number;
	potential_value_display?: PotentialValueDisplay;
	address?: string;
	note?: string;
	source?: string;
	source_detail?: string;
	campaign?: string;
	status: LeadStatus;
	score?: number;
	priority?: LeadPriority;
	custom_fields?: Record<string, any>;
	status_label: string;
	owner_id?: number;
	owner?: User;
	user_id?: number;
	user?: User;
	unread_by_owner?: boolean;
	last_contact_at?: string;
	days_since_contact?: number;
	follow_up_sla_days?: number;
	follow_up_due?: boolean;
	activities?: Activity[];
	notes?: Note[];
	tasks?: Task[];
	created_at: string;
	updated_at: string;
}

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
	{ value: "LEAD_NEW", label: "Lead mới", color: "#6B7280" },
	{ value: "CONTACTED", label: "Đã liên hệ", color: "#60A5FA" },
	{ value: "INTERESTED", label: "Quan tâm", color: "#3B82F6" },
	{ value: "QUALIFIED", label: "Có nhu cầu", color: "#F59E0B" },
	{ value: "WON", label: "Đã mua", color: "#1E40AF" },
	{ value: "LOST", label: "Không nhu cầu", color: "#EF4444" },
];

// Các kiểu dữ liệu Task (Công việc)
export type TaskStatus = "IN_PROGRESS" | "DONE" | "OVERDUE";
export type TaskType = "CALL" | "MEETING" | "FOLLOW_UP" | "DEMO" | "OTHER";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskReminder = "15_MIN" | "1_HOUR" | "1_DAY" | "NONE";

export interface Task {
	id: number;
	title: string;
	description?: string;
	notes?: string;
	type?: TaskType;
	priority?: TaskPriority;
	reminder_type?: TaskReminder;
	status: TaskStatus;
	computed_status: TaskStatus;
	due_date: string;
	completed_at?: string;
	recurrence_type?: "DAILY" | "WEEKLY" | "MONTHLY";
	recurrence_interval?: number;
	recurrence_end_date?: string;
	reminder_at?: string;
	is_completed: boolean;
	is_overdue: boolean;
	is_today: boolean;
	is_upcoming: boolean;
	lead_id?: number;
	lead?: { id: number; full_name: string };
	opportunity?: { id: number; stage: string; estimated_value?: number };
	user_id?: number;
	user?: User;
	assigned_to?: number;
	assigned_user?: User;
	created_by?: number;
	creator?: User;
	created_at: string;
	updated_at: string;
	subtasks?: TaskSubtask[];
	history?: TaskHistory[];
	tags?: TaskTag[];
}

export interface GroupedTasks {
	today: Task[];
	overdue: Task[];
	upcoming: Task[];
	counts: {
		today: number;
		overdue: number;
		upcoming: number;
	};
}

export interface TaskSubtask {
	id: number;
	title: string;
	is_done: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface TaskHistory {
	id: number;
	action: string;
	payload?: Record<string, any>;
	user_id?: number;
	user?: User;
	created_at?: string;
}

export interface TaskTag {
	id: number;
	name: string;
	color?: string;
}

export interface LeadFilter {
	id: number;
	name: string;
	filters: Record<string, any>;
	is_default: boolean;
}

export interface OpportunityPipelineItem {
	stage: OpportunityStage;
	total_deals: number;
	total_value: number;
	expected_revenue: number;
}

export interface OpportunityForecastItem {
	month: string;
	expected_revenue: number;
	total: number;
}

export interface BottleneckData {
	stage: OpportunityStage;
	avg_days: number;
	total_deals: number;
}

export interface SalesPerformance {
	sales_id: number;
	sales_name: string;
	won_deals: number;
	total_deals: number;
	revenue: number;
	win_rate: number;
	avg_deal_time: number | null;
}

export interface DashboardAnalytics {
	// Tổng quan
	total_pipeline_value: number;
	forecast_revenue: number;
	forecast_this_month: number;

	// Pipeline theo giai đoạn
	pipeline_by_stage: OpportunityPipelineItem[];

	// Điểm nghẽ
	bottleneck: BottleneckData | null;

	// Hiệu suất bán hàng
	sales_performance: SalesPerformance[];

	// Các chỉ số cũ
	leads_total: number;
	leads_uncontacted: number;
	leads_stale_7d: number;
	tasks_today: number;
	tasks_overdue: number;
	notifications_unread: number;
}

export type OpportunityStage = "PROSPECTING" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export interface OpportunityLineItem {
	id: number;
	product_name: string;
	quantity: number;
	unit_price: number;
	total_price: number;
	created_at?: string;
	updated_at?: string;
}

export interface OpportunityStageHistory {
	id: number;
	from_stage?: OpportunityStage;
	to_stage: OpportunityStage;
	probability?: number;
	changed_at?: string;
	changed_by?: number;
	changer?: User;
}

export interface Opportunity {
	id: number;
	lead_id: number;
	lead?: Lead;
	owner_id?: number;
	owner?: User;
	stage: OpportunityStage;
	probability?: number;
	estimated_value?: number;
	expected_revenue?: number;
	currency_code?: string;
	expected_close_date?: string;
	next_step?: string;
	decision_criteria?: string;
	competitor?: string;
	stage_updated_at?: string;
	line_items?: OpportunityLineItem[];
	stage_history?: OpportunityStageHistory[];
	created_at: string;
	updated_at: string;
}

// Các kiểu dữ liệu Activity (Hoạt động)
export type ActivityType = "CALL" | "TASK" | "NOTE";

export interface Activity {
	id: number;
	type: ActivityType;
	action: string;
	title?: string;
	content?: string;
	lead_id: number;
	user_id: number;
	user?: User;
	created_at: string;
}

// Các kiểu dữ liệu Note (Ghi chú)
export type NoteType = "normal" | "manager";

export interface Note {
	id: number;
	title?: string;
	content: string;
	lead_id: number;
	user_id: number;
	user?: User;
	type: NoteType;
	created_at: string;
	updated_at: string;
}

// Các kiểu dữ liệu Notification (Thông báo)
export type NotificationType =
	| "TASK_REMINDER" // Nhắc nhở task sắp đến hạn
	| "TASK_OVERDUE" // Task quá hạn
	| "TASK_ASSIGNED" // Task được giao cho bạn
	| "LEAD_ASSIGNED" // Khách hàng được giao cho bạn
	| "NO_FOLLOW_UP" // Khách hàng chưa được follow-up (cảnh báo)
	| "OPPORTUNITY_STAGE" // Giai đoạn cơ hội thay đổi
	| "DEAL_WON" // Deal thành công
	| "DEAL_LOST" // Deal thất bại
	// Các loại cũ để tương thích ngược
	| "LEAD"
	| "TASK"
	| "SYSTEM";

export interface AppNotification {
	id: number;
	type: NotificationType;
	title: string;
	body: string;
	type_label?: string;
	content: string; // Trường cũ, sử dụng body thay thế
	related_type?: "customer" | "task" | "opportunity";
	related_id?: number;
	payload?: {
		lead_id?: number;
		task_id?: number;
		opportunity_id?: number;
		assigned_by?: number;
		assigned_by_name?: string;
		due_date?: string;
		days_overdue?: number;
		days_since_activity?: number;
		lead_status?: string;
		stage?: string;
		old_stage?: string;
		new_stage?: string;
		deal_value?: number;
		customer_name?: string;
		task_title?: string;
		reason?: string;
		[key: string]: any;
	};
	is_read: boolean;
	user_id: number;
	created_at: string;
}

// Alias for backward compatibility
export type Notification = AppNotification;

// API Response types
export interface PaginatedResponse<T> {
	data: T[];
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
}

export interface AuthTokens {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
	user: User;
}

export interface LeadStats {
	total: number;
	by_status: {
		lead: number;
		contacted: number;
		caring: number;
		purchased: number;
		no_need: number;
	};
	not_followed_up: number;
	recently_updated: number;
}
