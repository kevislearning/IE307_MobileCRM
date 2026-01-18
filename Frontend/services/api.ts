import { Platform } from "react-native";
import { storage } from "./storage";

// TODO: Change this to your actual API URL
const ANDROID_BASE = "http://10.0.2.2:8000/api"; // Android emulator -> host
const LOCALHOST_BASE = "http://localhost:8000/api"; // iOS simulator / web
const LAN_BASE = "http://192.168.1.94:8000/api"; // Physical device

// Use LAN_BASE for physical device (Expo Go), ANDROID_BASE for emulator
const API_BASE_URL = LAN_BASE;

interface RequestOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	body?: any;
	headers?: Record<string, string>;
	requireAuth?: boolean;
}

// Auth failure callback - will be set by AuthContext
let onAuthFailure: (() => void) | null = null;

class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	// Set callback for auth failure (called by AuthContext)
	setOnAuthFailure(callback: () => void) {
		onAuthFailure = callback;
	}

	async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
		const { method = "GET", body, headers = {}, requireAuth = true } = options;

		const requestHeaders: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
			...headers,
		};

		if (requireAuth) {
			const token = await storage.getAccessToken();
			if (token) {
				requestHeaders["Authorization"] = `Bearer ${token}`;
			}
		}

		const config: RequestInit = {
			method,
			headers: requestHeaders,
		};

		if (body) {
			config.body = JSON.stringify(body);
		}

		try {
			const response = await fetch(`${this.baseUrl}${endpoint}`, config);

			// Handle token refresh if needed
			if (response.status === 401 && requireAuth) {
				const refreshed = await this.refreshToken();
				if (refreshed) {
					// Retry the original request
					const token = await storage.getAccessToken();
					requestHeaders["Authorization"] = `Bearer ${token}`;
					const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
						...config,
						headers: requestHeaders,
					});
					return this.handleResponse<T>(retryResponse);
				} else {
					// Refresh failed - notify auth context
					if (onAuthFailure) {
						onAuthFailure();
					}
				}
			}

			return this.handleResponse<T>(response);
		} catch (error) {
			console.error("API request failed:", error);
			throw error;
		}
	}

	private async handleResponse<T>(response: Response): Promise<T> {
		const text = await response.text();
		const parseJson = () => {
			try {
				return text ? JSON.parse(text) : {};
			} catch {
				return {};
			}
		};

		if (!response.ok) {
			const errorData: any = parseJson();
			throw {
				status: response.status,
				message: errorData.message || errorData.error || response.statusText || "Request failed",
				errors: errorData.errors,
			};
		}

		if (response.status === 204 || !text) {
			return {} as T;
		}

		return parseJson();
	}

	private async refreshToken(): Promise<boolean> {
		try {
			const refreshToken = await storage.getRefreshToken();
			if (!refreshToken) {
				return false;
			}

			const response = await fetch(`${this.baseUrl}/refresh`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({ refresh_token: refreshToken }),
			});

			if (!response.ok) {
				await storage.clearAll();
				return false;
			}

			const data = await response.json();
			await storage.setAccessToken(data.access_token);
			await storage.setRefreshToken(data.refresh_token);
			return true;
		} catch (error) {
			await storage.clearAll();
			return false;
		}
	}

	// Auth endpoints
	async login(email: string, password: string) {
		return this.request<any>("/login", {
			method: "POST",
			body: { email, password },
			requireAuth: false,
		});
	}

	async logout() {
		return this.request("/logout", { method: "POST" });
	}

	async getMe() {
		return this.request<{ user: any }>("/me");
	}

	// Password reset endpoints
	async sendOtp(email: string) {
		return this.request("/forgot", {
			method: "POST",
			body: { email },
			requireAuth: false,
		});
	}

	async verifyOtp(email: string, otp: string) {
		// Backend không có endpoint verify riêng; giữ API interface và trả về otp để bước kế tiếp dùng reset.
		return Promise.resolve({ reset_token: otp });
	}

	async resetPassword(email: string, resetToken: string, password: string, passwordConfirmation: string) {
		return this.request("/reset", {
			method: "POST",
			body: {
				email,
				otp: resetToken,
				password,
				password_confirmation: passwordConfirmation,
			},
			requireAuth: false,
		});
	}

	async changePassword(data: { current_password: string; password: string; password_confirmation: string }) {
		// Backend expects new_password instead of password
		return this.request("/password/change", {
			method: "POST",
			body: {
				current_password: data.current_password,
				new_password: data.password,
			},
		});
	}

	// User endpoints
	async getProfile() {
		return this.request("/me");
	}

	async updateProfile(data: any) {
		return this.request("/me", {
			method: "PUT",
			body: data,
		});
	}

	async getSettings() {
		// Settings are part of user profile
		const response: any = await this.request("/me");
		return { data: response.user };
	}

	async updateSettings(data: any) {
		return this.request("/me", {
			method: "PUT",
			body: data,
		});
	}

	async getTeamMembers() {
		return this.request("/team-members");
	}

	// Lead endpoints
	async getLeads(params?: Record<string, any>) {
		const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
		return this.request(`/leads${queryString}`);
	}

	async getLead(id: number) {
		return this.request(`/leads/${id}`);
	}

	async createLead(data: any) {
		return this.request("/leads", {
			method: "POST",
			body: data,
		});
	}

	async updateLead(id: number, data: any) {
		return this.request(`/leads/${id}`, {
			method: "PUT",
			body: data,
		});
	}

	async deleteLead(id: number) {
		return this.request(`/leads/${id}`, { method: "DELETE" });
	}

	async assignLead(leadId: number, ownerId: number) {
		return this.request(`/leads/${leadId}/assign`, {
			method: "POST",
			body: { assigned_to: ownerId },
		});
	}

	async getLeadStats() {
		return this.request("/dashboard");
	}

	// Note endpoints - dedicated notes API
	async getNotes(leadId: number) {
		return this.request(`/leads/${leadId}/notes`);
	}

	async getLeadNotes(leadId: number) {
		return this.getNotes(leadId);
	}

	async createNote(data: { title: string; content: string; lead_id: number; type?: string }) {
		return this.request("/notes", {
			method: "POST",
			body: {
				lead_id: data.lead_id,
				title: data.title,
				content: data.content,
				type: data.type || "normal",
			},
		});
	}

	async deleteNote(id: number) {
		return this.request(`/notes/${id}`, { method: "DELETE" });
	}

	// Activity endpoints
	async getLeadActivities(leadId: number) {
		return this.request(`/leads/${leadId}/activities`);
	}

	async getLeadCareHistory(leadId: number) {
		return this.request(`/leads/${leadId}/care-history`);
	}

	async getLeadTimeline(leadId: number) {
		return this.request(`/leads/${leadId}/timeline`);
	}

	async getLeadDuplicates(params: { lead_id?: number; email?: string; phone_number?: string }) {
		const search = new URLSearchParams();
		if (params.lead_id) search.set("lead_id", String(params.lead_id));
		if (params.email) search.set("email", params.email);
		if (params.phone_number) search.set("phone_number", params.phone_number);
		const queryString = search.toString() ? "?" + search.toString() : "";
		return this.request(`/leads/duplicates${queryString}`);
	}

	async mergeLead(targetLeadId: number, sourceLeadId: number, note?: string) {
		return this.request(`/leads/${targetLeadId}/merge`, {
			method: "POST",
			body: { source_lead_id: sourceLeadId, note },
		});
	}

	async getLeadFilters() {
		return this.request("/lead-filters");
	}

	async createLeadFilter(data: any) {
		return this.request("/lead-filters", { method: "POST", body: data });
	}

	async updateLeadFilter(id: number, data: any) {
		return this.request(`/lead-filters/${id}`, { method: "PUT", body: data });
	}

	async deleteLeadFilter(id: number) {
		return this.request(`/lead-filters/${id}`, { method: "DELETE" });
	}

	async createActivity(data: any) {
		return this.request("/activities", {
			method: "POST",
			body: data,
		});
	}

	// Task endpoints
	async getTasks(params?: Record<string, any>) {
		const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
		return this.request(`/tasks${queryString}`);
	}

	async getGroupedTasks(params?: Record<string, any>) {
		// Fetch all tasks and group them client-side
		const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
		const response: any = await this.request(`/tasks${queryString}`);
		const tasks: any[] = response.data || [];

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = today.toISOString().split("T")[0];

		const grouped = {
			today: [] as any[],
			overdue: [] as any[],
			upcoming: [] as any[],
			counts: { today: 0, overdue: 0, upcoming: 0 },
		};

		tasks.forEach((task: any) => {
			const dueDate = task.due_date ? new Date(task.due_date) : null;
			const dueDateStr = dueDate ? dueDate.toISOString().split("T")[0] : null;

			if (task.status === "DONE") {
				// Completed tasks go to their original bucket but marked as done
				if (dueDateStr === todayStr) {
					grouped.today.push(task);
				} else if (dueDate && dueDate < today) {
					grouped.overdue.push(task);
				} else {
					grouped.upcoming.push(task);
				}
			} else if (dueDateStr === todayStr) {
				grouped.today.push(task);
			} else if (dueDate && dueDate < today) {
				task.is_overdue = true;
				grouped.overdue.push(task);
			} else {
				grouped.upcoming.push(task);
			}
		});

		grouped.counts = {
			today: grouped.today.length,
			overdue: grouped.overdue.length,
			upcoming: grouped.upcoming.length,
		};

		return grouped;
	}

	async getTask(id: number) {
		return this.request(`/tasks/${id}`);
	}

	async createTask(data: any) {
		return this.request("/tasks", {
			method: "POST",
			body: data,
		});
	}

	async updateTask(id: number, data: any) {
		return this.request(`/tasks/${id}`, {
			method: "PUT",
			body: data,
		});
	}

	async completeTask(id: number) {
		return this.request(`/tasks/${id}`, {
			method: "PUT",
			body: { status: "DONE" },
		});
	}

	async deleteTask(id: number) {
		return this.request(`/tasks/${id}`, { method: "DELETE" });
	}

	async getTaskTags() {
		return this.request("/task-tags");
	}

	async createTaskTag(data: any) {
		return this.request("/task-tags", { method: "POST", body: data });
	}

	async updateTaskTags(taskId: number, tagIds: number[]) {
		return this.request(`/tasks/${taskId}/tags`, { method: "PUT", body: { tag_ids: tagIds } });
	}

	// Task subtasks
	async getTaskSubtasks(taskId: number) {
		return this.request(`/tasks/${taskId}/subtasks`);
	}

	async createTaskSubtask(taskId: number, title: string) {
		return this.request(`/tasks/${taskId}/subtasks`, {
			method: "POST",
			body: { title },
		});
	}

	async updateTaskSubtask(id: number, data: { title?: string; is_done?: boolean }) {
		return this.request(`/subtasks/${id}`, {
			method: "PUT",
			body: data,
		});
	}

	async deleteTaskSubtask(id: number) {
		return this.request(`/subtasks/${id}`, { method: "DELETE" });
	}

	// Task templates
	async getTaskTemplates() {
		return this.request("/task-templates");
	}

	async createTaskTemplate(data: any) {
		return this.request("/task-templates", { method: "POST", body: data });
	}

	async updateTaskTemplate(id: number, data: any) {
		return this.request(`/task-templates/${id}`, { method: "PUT", body: data });
	}

	async deleteTaskTemplate(id: number) {
		return this.request(`/task-templates/${id}`, { method: "DELETE" });
	}

	// Opportunity endpoints
	async getOpportunities(params?: Record<string, any>) {
		const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
		return this.request(`/opportunities${queryString}`);
	}

	async getOpportunity(id: number) {
		return this.request(`/opportunities/${id}`);
	}

	async createOpportunity(data: any) {
		return this.request("/opportunities", { method: "POST", body: data });
	}

	async updateOpportunity(id: number, data: any) {
		return this.request(`/opportunities/${id}`, { method: "PUT", body: data });
	}

	async deleteOpportunity(id: number) {
		return this.request(`/opportunities/${id}`, { method: "DELETE" });
	}

	async getOpportunityPipeline() {
		return this.request("/opportunities/pipeline");
	}

	async getOpportunityForecast() {
		return this.request("/opportunities/forecast");
	}

	async getOpportunityLineItems(opportunityId: number) {
		return this.request(`/opportunities/${opportunityId}/line-items`);
	}

	async createOpportunityLineItem(opportunityId: number, data: any) {
		return this.request(`/opportunities/${opportunityId}/line-items`, { method: "POST", body: data });
	}

	async updateOpportunityLineItem(id: number, data: any) {
		return this.request(`/opportunity-line-items/${id}`, { method: "PUT", body: data });
	}

	async deleteOpportunityLineItem(id: number) {
		return this.request(`/opportunity-line-items/${id}`, { method: "DELETE" });
	}

	// Notification endpoints
	async getNotifications(params?: Record<string, any>) {
		const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
		return this.request(`/notifications${queryString}`);
	}

	async markNotificationAsRead(id: number) {
		return this.request(`/notifications/${id}/read`, { method: "PUT" });
	}

	async markNotificationAsUnread(id: number) {
		return this.request(`/notifications/${id}/unread`, { method: "PUT" });
	}

	async markAllNotificationsAsRead() {
		return this.request("/notifications/read-all", { method: "PUT" });
	}

	async deleteNotification(id: number) {
		return this.request(`/notifications/${id}`, { method: "DELETE" });
	}

	async triggerTaskReminders() {
		return this.request("/notifications/task-reminders", { method: "POST" });
	}

	async triggerFollowUpDue() {
		return this.request("/notifications/follow-up-due", { method: "POST" });
	}

	async getDashboard() {
		return this.request("/dashboard");
	}
}

export const api = new ApiClient(API_BASE_URL);
