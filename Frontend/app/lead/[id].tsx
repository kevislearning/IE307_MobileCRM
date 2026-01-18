import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Linking, FlatList, TextInput as RNTextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Lead, Note, Activity, Task, LeadStatus, User, CompanySize, Industry, TaskType, TaskPriority } from "@/types";
import { Loading, Badge, Button } from "@/components/ui";

type TabType = "info" | "activities" | "notes" | "tasks";

export default function LeadDetailScreen() {
	const { id } = useLocalSearchParams();
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { isManager, user } = useAuth();
	const { t } = useTranslation();

	// Status options using translation - theo States.txt
	// 1. Lead mới → 2. Đã liên hệ → 3. Quan tâm → 4. Có nhu cầu → 5. Đã mua → 6. Không nhu cầu
	const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
		{ value: "LEAD_NEW", label: t("customers.statusLeadNew"), color: "#6B7280" }, // Xám
		{ value: "CONTACTED", label: t("customers.statusContacted"), color: "#60A5FA" }, // Xanh nhạt
		{ value: "INTERESTED", label: t("customers.statusInterested"), color: "#3B82F6" }, // Xanh
		{ value: "QUALIFIED", label: t("customers.statusQualified"), color: "#F59E0B" }, // Cam ⚠️
		{ value: "WON", label: t("customers.statusWon"), color: "#1E40AF" }, // Xanh đậm
		{ value: "LOST", label: t("customers.statusLost"), color: "#EF4444" }, // Đỏ
	];

	// Company size options
	const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
		{ value: "small", label: t("customers.companySizeSmall") },
		{ value: "medium", label: t("customers.companySizeMedium") },
		{ value: "enterprise", label: t("customers.companySizeEnterprise") },
	];

	// Industry options
	const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
		{ value: "education", label: t("customers.industryEducation") },
		{ value: "retail", label: t("customers.industryRetail") },
		{ value: "finance", label: t("customers.industryFinance") },
		{ value: "technology", label: t("customers.industryTechnology") },
		{ value: "healthcare", label: t("customers.industryHealthcare") },
		{ value: "manufacturing", label: t("customers.industryManufacturing") },
		{ value: "other", label: t("customers.industryOther") },
	];

	// Task type options
	const TASK_TYPE_OPTIONS: { value: TaskType; label: string; icon: string }[] = [
		{ value: "CALL", label: t("tasks.typeCall"), icon: "call" },
		{ value: "MEETING", label: t("tasks.typeMeeting"), icon: "people" },
		{ value: "FOLLOW_UP", label: t("tasks.typeFollowUp"), icon: "arrow-redo" },
		{ value: "DEMO", label: t("tasks.typeDemo"), icon: "desktop" },
		{ value: "OTHER", label: t("tasks.typeOther"), icon: "ellipsis-horizontal" },
	];

	// Task priority options
	const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
		{ value: "LOW", label: t("customers.priorityLow"), color: "#6B7280" },
		{ value: "MEDIUM", label: t("customers.priorityMedium"), color: "#F59E0B" },
		{ value: "HIGH", label: t("customers.priorityHigh"), color: "#EF4444" },
	];

	const [lead, setLead] = useState<Lead | null>(null);
	const [notes, setNotes] = useState<Note[]>([]);
	const [activities, setActivities] = useState<Activity[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>("info");

	// Note form state
	const [newNote, setNewNote] = useState("");
	const [noteType, setNoteType] = useState<"normal" | "manager">("normal");
	const [savingNote, setSavingNote] = useState(false);

	// Task form state
	const [showTaskModal, setShowTaskModal] = useState(false);
	const [taskTitle, setTaskTitle] = useState("");
	const [taskType, setTaskType] = useState<TaskType>("FOLLOW_UP");
	const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
	const [taskDueDate, setTaskDueDate] = useState("");
	const [savingTask, setSavingTask] = useState(false);

	// Activity form state
	const [showActivityModal, setShowActivityModal] = useState(false);
	const [activityType, setActivityType] = useState<"CALL" | "NOTE">("CALL");
	const [activityContent, setActivityContent] = useState("");
	const [savingActivity, setSavingActivity] = useState(false);

	// Manager-specific states
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [showAssignModal, setShowAssignModal] = useState(false);
	const [assigning, setAssigning] = useState(false);

	// Data fetching functions
	const fetchLeadDetails = async (isRefresh = false) => {
		try {
			if (!isRefresh) setLoading(true);
			const response = await api.getLead(Number(id));
			setLead((response as any).data);
		} catch (error) {
			console.error("Error fetching lead:", error);
			Alert.alert(t("common.error"), t("customers.cannotLoadCustomer"));
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const fetchNotes = async () => {
		try {
			const response = await api.getNotes(Number(id));
			setNotes((response as any).data || []);
		} catch (error) {
			console.error("Error fetching notes:", error);
		}
	};

	const fetchActivities = async () => {
		try {
			const response = await api.getLeadActivities(Number(id));
			const data = Array.isArray(response) ? response : (response as any).data || [];
			setActivities(data);
		} catch (error) {
			console.error("Error fetching activities:", error);
		}
	};

	const fetchTasks = async () => {
		try {
			const response = await api.getTasks({ lead_id: Number(id) });
			setTasks((response as any).data || []);
		} catch (error) {
			console.error("Error fetching tasks:", error);
		}
	};

	const fetchTeamMembers = async () => {
		if (!isManager) return;
		try {
			const response = await api.getTeamMembers();
			setTeamMembers((response as any).data || []);
		} catch (error) {
			console.error("Error fetching team members:", error);
		}
	};

	useFocusEffect(
		useCallback(() => {
			fetchLeadDetails();
			fetchNotes();
			fetchActivities();
			fetchTasks();
			fetchTeamMembers();
		}, [id]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchLeadDetails(true);
		fetchNotes();
		fetchActivities();
		fetchTasks();
	};

	// === ACTION HANDLERS ===

	// Quick call action
	const handleCall = async () => {
		if (lead?.phone_number) {
			try {
				// Log the call activity
				await api.createActivity({
					lead_id: lead.id,
					type: "CALL",
					content: `${t("activities.callWith")} ${lead.full_name}`,
					happened_at: new Date().toISOString(),
				});
				fetchActivities();
			} catch (error) {
				console.error("Error logging call activity:", error);
			}
			Linking.openURL(`tel:${lead.phone_number}`);
		}
	};

	// Status change
	const handleStatusChange = async (newStatus: LeadStatus) => {
		try {
			await api.updateLead(Number(id), { status: newStatus });
			setLead((prev) => (prev ? { ...prev, status: newStatus } : null));

			// Log status change as activity
			await api.createActivity({
				lead_id: Number(id),
				type: "NOTE",
				content: `${t("activities.statusChanged")}: ${STATUS_OPTIONS.find((s) => s.value === lead?.status)?.label} → ${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}`,
				happened_at: new Date().toISOString(),
			});
			fetchActivities();

			Alert.alert(t("common.success"), t("customers.statusUpdated"));
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("customers.cannotUpdateStatus"));
		}
	};

	// Assign sales (Manager only)
	const handleAssignSales = async (ownerId: number) => {
		setAssigning(true);
		try {
			await api.assignLead(Number(id), ownerId);
			const assignedUser = teamMembers.find((m) => m.id === ownerId);
			setLead((prev) =>
				prev
					? {
							...prev,
							owner_id: ownerId,
							owner: assignedUser,
							user_id: ownerId,
							user: assignedUser,
						}
					: null,
			);
			setShowAssignModal(false);
			Alert.alert(t("common.success"), t("customers.assignSuccess"));
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("customers.cannotAssign"));
		} finally {
			setAssigning(false);
		}
	};

	// Add note
	const handleAddNote = async () => {
		if (!newNote.trim()) return;

		setSavingNote(true);
		try {
			await api.createNote({
				lead_id: Number(id),
				title: t("notes.addNote"),
				content: newNote,
				type: isManager ? noteType : "normal",
			});
			setNewNote("");
			fetchNotes();
			Alert.alert(t("common.success"), t("notes.noteAdded"));
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("notes.cannotAddNote"));
		} finally {
			setSavingNote(false);
		}
	};

	// Add activity
	const handleAddActivity = async () => {
		if (!activityContent.trim()) return;

		setSavingActivity(true);
		try {
			await api.createActivity({
				lead_id: Number(id),
				type: activityType,
				content: activityContent,
				happened_at: new Date().toISOString(),
			});
			setActivityContent("");
			setShowActivityModal(false);
			fetchActivities();
			Alert.alert(t("common.success"), t("activities.activityAdded"));
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("activities.cannotAddActivity"));
		} finally {
			setSavingActivity(false);
		}
	};

	// Add task
	const handleAddTask = async () => {
		if (!taskTitle.trim() || !taskDueDate) {
			Alert.alert(t("common.error"), t("tasks.enterTaskTitle"));
			return;
		}

		setSavingTask(true);
		try {
			await api.createTask({
				lead_id: Number(id),
				title: taskTitle,
				type: taskType,
				priority: taskPriority,
				due_date: taskDueDate,
			});
			setTaskTitle("");
			setTaskDueDate("");
			setShowTaskModal(false);
			fetchTasks();
			Alert.alert(t("common.success"), t("tasks.taskCreated"));
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("tasks.cannotCreateTask"));
		} finally {
			setSavingTask(false);
		}
	};

	// Complete task
	const handleCompleteTask = async (taskId: number) => {
		try {
			await api.updateTask(taskId, { status: "DONE" });
			fetchTasks();
			fetchActivities(); // Task completion should show in activities
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message);
		}
	};

	// === HELPER FUNCTIONS ===
	const getStatusColor = (status: string) => {
		return STATUS_OPTIONS.find((s) => s.value === status)?.color || colors.textSecondary;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("vi-VN", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatShortDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("vi-VN", {
			day: "2-digit",
			month: "2-digit",
		});
	};

	const formatCurrency = (value?: number) => {
		if (value === null || value === undefined) return "-";
		return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
	};

	// Group tasks by status
	const groupedTasks = useMemo(() => {
		const overdue: Task[] = [];
		const today: Task[] = [];
		const upcoming: Task[] = [];

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		tasks.forEach((task) => {
			if (task.status === "DONE") return;

			const dueDate = new Date(task.due_date);
			dueDate.setHours(0, 0, 0, 0);

			if (dueDate < now) {
				overdue.push(task);
			} else if (dueDate.getTime() === now.getTime()) {
				today.push(task);
			} else {
				upcoming.push(task);
			}
		});

		return { overdue, today, upcoming };
	}, [tasks]);

	// Generate timeline from activities
	const timelineItems = useMemo(() => {
		// Merge activities, completed tasks, status changes
		const items = [...activities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
		return items;
	}, [activities]);

	const getActivityIcon = (type: string) => {
		switch (type) {
			case "CALL":
				return { name: "call", color: colors.success };
			case "NOTE":
				return { name: "document-text", color: colors.info };
			case "TASK":
				return { name: "checkbox", color: colors.warning };
			default:
				return { name: "ellipse", color: colors.primary };
		}
	};

	const getPotentialValueColor = (level?: string) => {
		switch (level) {
			case "low":
				return colors.textSecondary;
			case "medium":
				return colors.warning;
			case "high":
				return colors.success;
			default:
				return colors.textSecondary;
		}
	};

	// === LOADING STATE ===
	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Loading />
			</SafeAreaView>
		);
	}

	if (!lead) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.errorText, { color: colors.error }]}>{t("customers.customerNotFound")}</Text>
			</SafeAreaView>
		);
	}

	// Tab definitions
	const tabs: { id: TabType; label: string }[] = [
		{ id: "info", label: t("customers.tabInfo") },
		{ id: "activities", label: t("customers.tabActivities") },
		{ id: "notes", label: t("customers.tabNotes") },
		{ id: "tasks", label: t("customers.tabTasks") },
	];

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* ========== HEADER ========== */}
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<View style={styles.headerTitleContainer}>
					<Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
						{lead.full_name}
					</Text>
					<Badge label={STATUS_OPTIONS.find((s) => s.value === lead.status)?.label || lead.status} color={getStatusColor(lead.status)} size="sm" />
				</View>
				<TouchableOpacity style={[styles.callButton, { backgroundColor: colors.success + "15" }]} onPress={handleCall} disabled={!lead.phone_number}>
					<Ionicons name="call" size={24} color={lead.phone_number ? colors.success : colors.textLight} />
				</TouchableOpacity>
			</View>

			{/* Manager info bar */}
			{isManager && (
				<View style={[styles.managerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
					<View style={styles.salesInfo}>
						<Text style={[styles.salesLabel, { color: colors.textSecondary }]}>{t("customers.salesInCharge")}:</Text>
						<Text style={[styles.salesName, { color: colors.text }]}>{lead.owner?.name || lead.user?.name || t("customers.notAssigned")}</Text>
					</View>
					<TouchableOpacity style={[styles.assignButton, { backgroundColor: colors.primary + "15" }]} onPress={() => setShowAssignModal(true)}>
						<Ionicons name="person-add-outline" size={18} color={colors.primary} />
					</TouchableOpacity>
				</View>
			)}

			{/* ========== TABS ========== */}
			<View style={[styles.tabs, { borderBottomColor: colors.border }]}>
				{tabs.map((tab) => (
					<TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab(tab.id)}>
						<Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : colors.textSecondary }]}>{tab.label}</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* ========== TAB CONTENT ========== */}
			<ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}>
				{/* ========== TAB: THÔNG TIN ========== */}
				{activeTab === "info" && (
					<View style={styles.infoTab}>
						{/* Contact Info Section */}
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("customers.contactInfo")}</Text>
						<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
							{/* Phone - Primary (clickable) */}
							<TouchableOpacity style={styles.infoRow} onPress={handleCall} disabled={!lead.phone_number}>
								<View style={styles.infoLeft}>
									<Ionicons name="call" size={18} color={colors.success} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.phone")}</Text>
								</View>
								<Text style={[styles.infoValue, { color: lead.phone_number ? colors.success : colors.textLight }]}>{lead.phone_number || "-"}</Text>
							</TouchableOpacity>

							{/* Phone - Secondary */}
							{lead.phone_secondary && (
								<View style={styles.infoRow}>
									<View style={styles.infoLeft}>
										<Ionicons name="call-outline" size={18} color={colors.textSecondary} />
										<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.phoneSecondary")}</Text>
									</View>
									<Text style={[styles.infoValue, { color: colors.text }]}>{lead.phone_secondary}</Text>
								</View>
							)}

							{/* Email */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="mail" size={18} color={colors.info} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("auth.email")}</Text>
								</View>
								<Text style={[styles.infoValue, { color: colors.text }]}>{lead.email || "-"}</Text>
							</View>

							{/* Website */}
							{lead.website && (
								<TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(lead.website!.startsWith("http") ? lead.website! : `https://${lead.website}`)}>
									<View style={styles.infoLeft}>
										<Ionicons name="globe" size={18} color={colors.primary} />
										<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.website")}</Text>
									</View>
									<Text style={[styles.infoValue, { color: colors.primary }]}>{lead.website}</Text>
								</TouchableOpacity>
							)}

							{/* Address */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="location" size={18} color={colors.warning} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.address")}</Text>
								</View>
								<Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
									{lead.address || "-"}
								</Text>
							</View>
						</View>

						{/* Business Info Section */}
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("customers.businessInfo")}</Text>
						<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
							{/* Company */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="business" size={18} color={colors.primary} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.company")}</Text>
								</View>
								<Text style={[styles.infoValue, { color: colors.text }]}>{lead.company || "-"}</Text>
							</View>

							{/* Company Size */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="people" size={18} color={colors.info} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.companySize")}</Text>
								</View>
								<Text style={[styles.infoValue, { color: colors.text }]}>{COMPANY_SIZE_OPTIONS.find((o) => o.value === lead.company_size)?.label || "-"}</Text>
							</View>

							{/* Industry */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="briefcase" size={18} color={colors.warning} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.industry")}</Text>
								</View>
								<Text style={[styles.infoValue, { color: colors.text }]}>{INDUSTRY_OPTIONS.find((o) => o.value === lead.industry)?.label || "-"}</Text>
							</View>

							{/* Priority */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="flag" size={18} color={colors.error} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.priority")}</Text>
								</View>
								<Badge label={TASK_PRIORITY_OPTIONS.find((o) => o.value === lead.priority)?.label || lead.priority || "-"} color={TASK_PRIORITY_OPTIONS.find((o) => o.value === lead.priority)?.color || colors.textSecondary} size="sm" />
							</View>

							{/* Potential Value */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="trending-up" size={18} color={colors.success} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.potentialValue")}</Text>
								</View>
								{lead.potential_value_display ? (
									<View style={styles.potentialValueContainer}>
										<Text style={[styles.potentialValueLabel, { color: getPotentialValueColor(lead.potential_value_display.level) }]}>{lead.potential_value_display.label}</Text>
										<Text style={[styles.potentialValueRange, { color: colors.textSecondary }]}>({lead.potential_value_display.range})</Text>
									</View>
								) : (
									<Text style={[styles.infoValue, { color: colors.textLight }]}>-</Text>
								)}
							</View>

							{/* Budget */}
							<View style={styles.infoRow}>
								<View style={styles.infoLeft}>
									<Ionicons name="wallet" size={18} color={colors.success} />
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.budget")}</Text>
								</View>
								<Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(lead.budget)}</Text>
							</View>
						</View>

						{/* Admin Info Section (Manager view) */}
						{isManager && (
							<>
								<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("customers.adminInfo")}</Text>
								<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
									{/* Sales In Charge */}
									<View style={styles.infoRow}>
										<View style={styles.infoLeft}>
											<Ionicons name="person" size={18} color={colors.primary} />
											<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.salesInCharge")}</Text>
										</View>
										<Text style={[styles.infoValue, { color: colors.text }]}>{lead.owner?.name || lead.user?.name || t("customers.notAssigned")}</Text>
									</View>

									{/* Last Interaction */}
									<View style={styles.infoRow}>
										<View style={styles.infoLeft}>
											<Ionicons name="time" size={18} color={colors.warning} />
											<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.lastInteraction")}</Text>
										</View>
										<Text style={[styles.infoValue, { color: colors.text }]}>{lead.last_contact_at ? formatDate(lead.last_contact_at) : "-"}</Text>
									</View>

									{/* Days Since Contact */}
									<View style={styles.infoRow}>
										<View style={styles.infoLeft}>
											<Ionicons name="calendar" size={18} color={colors.error} />
											<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.daysSinceContact")}</Text>
										</View>
										<Text
											style={[
												styles.infoValue,
												{
													color: lead.days_since_contact && lead.days_since_contact > 7 ? colors.error : colors.text,
												},
											]}>
											{lead.days_since_contact !== null && lead.days_since_contact !== undefined ? `${lead.days_since_contact} ${t("common.days")}` : "-"}
										</Text>
									</View>

									{/* Created At */}
									<View style={styles.infoRow}>
										<View style={styles.infoLeft}>
											<Ionicons name="add-circle" size={18} color={colors.info} />
											<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.createdAt")}</Text>
										</View>
										<Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(lead.created_at)}</Text>
									</View>
								</View>
							</>
						)}

						{/* Status Selector */}
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("customers.status")}</Text>
						<View style={styles.statusGrid}>
							{STATUS_OPTIONS.map((status) => (
								<TouchableOpacity
									key={status.value}
									style={[
										styles.statusOption,
										{
											backgroundColor: lead.status === status.value ? status.color + "20" : colors.card,
											borderColor: lead.status === status.value ? status.color : colors.border,
										},
									]}
									onPress={() => handleStatusChange(status.value)}>
									<Text
										style={[
											styles.statusOptionText,
											{
												color: lead.status === status.value ? status.color : colors.text,
											},
										]}>
										{status.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Source Info */}
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("customers.source")}</Text>
						<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
							<View style={styles.infoRow}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.source")}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{lead.source || "-"}</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("customers.campaign")}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{lead.campaign || "-"}</Text>
							</View>
						</View>
					</View>
				)}

				{/* ========== TAB: HOẠT ĐỘNG (Activities) ========== */}
				{activeTab === "activities" && (
					<View style={styles.activitiesTab}>
						{/* Add activity button */}
						<TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setShowActivityModal(true)}>
							<Ionicons name="add" size={20} color={colors.white} />
							<Text style={[styles.addButtonText, { color: colors.white }]}>{t("activities.addActivity")}</Text>
						</TouchableOpacity>

						{/* Timeline */}
						{timelineItems.length === 0 ? (
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("activities.noActivities")}</Text>
						) : (
							timelineItems.map((activity) => {
								const icon = getActivityIcon(activity.type);
								return (
									<View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
										<View style={[styles.activityIconContainer, { backgroundColor: icon.color + "20" }]}>
											<Ionicons name={icon.name as any} size={20} color={icon.color} />
										</View>
										<View style={styles.activityContent}>
											<View style={styles.activityHeader}>
												<Badge label={activity.type} color={icon.color} size="sm" />
												{activity.user && <Text style={[styles.activityUser, { color: colors.textSecondary }]}>{activity.user.name}</Text>}
											</View>
											<Text style={[styles.activityAction, { color: colors.text }]}>{activity.content || activity.action}</Text>
											<Text style={[styles.activityTime, { color: colors.textLight }]}>{formatDate(activity.created_at)}</Text>
										</View>
									</View>
								);
							})
						)}
					</View>
				)}

				{/* ========== TAB: GHI CHÚ (Notes) ========== */}
				{activeTab === "notes" && (
					<View style={styles.notesTab}>
						{/* Add note form */}
						<View style={[styles.addNoteContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
							<RNTextInput style={[styles.noteInput, { color: colors.text, borderColor: colors.border }]} placeholder={t("notes.notePlaceholder")} placeholderTextColor={colors.textLight} value={newNote} onChangeText={setNewNote} multiline />
							{isManager && (
								<View style={styles.noteTypeSelector}>
									<TouchableOpacity
										style={[
											styles.noteTypeOption,
											{
												backgroundColor: noteType === "normal" ? colors.primary + "20" : colors.background,
												borderColor: noteType === "normal" ? colors.primary : colors.border,
											},
										]}
										onPress={() => setNoteType("normal")}>
										<Text style={[styles.noteTypeText, { color: noteType === "normal" ? colors.primary : colors.textSecondary }]}>{t("notes.salesNote")}</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.noteTypeOption,
											{
												backgroundColor: noteType === "manager" ? colors.warning + "20" : colors.background,
												borderColor: noteType === "manager" ? colors.warning : colors.border,
											},
										]}
										onPress={() => setNoteType("manager")}>
										<Text style={[styles.noteTypeText, { color: noteType === "manager" ? colors.warning : colors.textSecondary }]}>{t("notes.managerNote")}</Text>
									</TouchableOpacity>
								</View>
							)}
							<Button title={t("common.save")} onPress={handleAddNote} loading={savingNote} disabled={!newNote.trim()} size="sm" />
						</View>

						{/* Notes list */}
						{notes.length === 0 ? (
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("notes.noNotes")}</Text>
						) : (
							notes.map((note) => (
								<View
									key={note.id}
									style={[
										styles.noteCard,
										{
											backgroundColor: note.type === "manager" ? colors.warning + "10" : colors.card,
											borderColor: note.type === "manager" ? colors.warning : colors.border,
										},
									]}>
									{note.type === "manager" && <Badge label={t("notes.manager")} color={colors.warning} size="sm" />}
									<Text style={[styles.noteContent, { color: colors.text }]}>{note.content}</Text>
									<View style={styles.noteFooter}>
										{note.user && <Text style={[styles.noteAuthor, { color: colors.textSecondary }]}>— {note.user.name}</Text>}
										<Text style={[styles.noteTime, { color: colors.textLight }]}>{formatDate(note.created_at)}</Text>
									</View>
								</View>
							))
						)}
					</View>
				)}

				{/* ========== TAB: CÔNG VIỆC (Tasks) ========== */}
				{activeTab === "tasks" && (
					<View style={styles.tasksTab}>
						{/* Add task button */}
						<TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setShowTaskModal(true)}>
							<Ionicons name="add" size={20} color={colors.white} />
							<Text style={[styles.addButtonText, { color: colors.white }]}>{t("tasks.addTask")}</Text>
						</TouchableOpacity>

						{/* Overdue tasks */}
						{groupedTasks.overdue.length > 0 && (
							<>
								<Text style={[styles.taskGroupTitle, { color: colors.error }]}>
									<Ionicons name="warning" size={16} color={colors.error} /> {t("tasks.overdue")} ({groupedTasks.overdue.length})
								</Text>
								{groupedTasks.overdue.map((task) => (
									<TaskCard key={task.id} task={task} colors={colors} t={t} onComplete={() => handleCompleteTask(task.id)} onPress={() => router.push(`/task/${task.id}`)} taskTypeOptions={TASK_TYPE_OPTIONS} isOverdue />
								))}
							</>
						)}

						{/* Today tasks */}
						{groupedTasks.today.length > 0 && (
							<>
								<Text style={[styles.taskGroupTitle, { color: colors.warning }]}>
									<Ionicons name="today" size={16} color={colors.warning} /> {t("common.today")} ({groupedTasks.today.length})
								</Text>
								{groupedTasks.today.map((task) => (
									<TaskCard key={task.id} task={task} colors={colors} t={t} onComplete={() => handleCompleteTask(task.id)} onPress={() => router.push(`/task/${task.id}`)} taskTypeOptions={TASK_TYPE_OPTIONS} />
								))}
							</>
						)}

						{/* Upcoming tasks */}
						{groupedTasks.upcoming.length > 0 && (
							<>
								<Text style={[styles.taskGroupTitle, { color: colors.info }]}>
									<Ionicons name="calendar" size={16} color={colors.info} /> {t("tasks.upcoming")} ({groupedTasks.upcoming.length})
								</Text>
								{groupedTasks.upcoming.map((task) => (
									<TaskCard key={task.id} task={task} colors={colors} t={t} onComplete={() => handleCompleteTask(task.id)} onPress={() => router.push(`/task/${task.id}`)} taskTypeOptions={TASK_TYPE_OPTIONS} />
								))}
							</>
						)}

						{/* No tasks */}
						{tasks.filter((t) => t.status !== "DONE").length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("tasks.noTasks")}</Text>}

						{/* Completed tasks */}
						{tasks.filter((t) => t.status === "DONE").length > 0 && (
							<>
								<Text style={[styles.taskGroupTitle, { color: colors.success }]}>
									<Ionicons name="checkmark-circle" size={16} color={colors.success} /> {t("tasks.completed")} ({tasks.filter((t) => t.status === "DONE").length})
								</Text>
								{tasks
									.filter((t) => t.status === "DONE")
									.slice(0, 3)
									.map((task) => (
										<TaskCard key={task.id} task={task} colors={colors} t={t} onPress={() => router.push(`/task/${task.id}`)} taskTypeOptions={TASK_TYPE_OPTIONS} isCompleted />
									))}
							</>
						)}
					</View>
				)}

				<View style={{ height: 40 }} />
			</ScrollView>

			{/* ========== MODALS ========== */}

			{/* Assign Sales Modal */}
			{isManager && (
				<Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAssignModal(false)}>
					<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
						<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
							<TouchableOpacity onPress={() => setShowAssignModal(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
							<Text style={[styles.modalTitle, { color: colors.text }]}>{t("customers.assignSales")}</Text>
							<View style={{ width: 24 }} />
						</View>

						<View style={styles.modalContent}>
							<Text style={[styles.currentAssignText, { color: colors.textSecondary }]}>
								{t("customers.currentAssign")}: {lead.owner?.name || lead.user?.name || t("customers.notAssigned")}
							</Text>

							<FlatList
								data={teamMembers}
								keyExtractor={(item) => item.id.toString()}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={[
											styles.memberItem,
											{
												backgroundColor: (lead.owner_id || lead.user_id) === item.id ? colors.primary + "15" : colors.card,
												borderColor: (lead.owner_id || lead.user_id) === item.id ? colors.primary : colors.border,
											},
										]}
										onPress={() => handleAssignSales(item.id)}
										disabled={assigning}>
										<View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
											<Text style={{ color: colors.white, fontWeight: "bold" }}>{item.name.charAt(0)}</Text>
										</View>
										<View style={styles.memberInfo}>
											<Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
											<Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{item.email}</Text>
										</View>
										{(lead.owner_id || lead.user_id) === item.id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
									</TouchableOpacity>
								)}
								contentContainerStyle={{ paddingVertical: Spacing.md }}
							/>
						</View>
					</SafeAreaView>
				</Modal>
			)}

			{/* Add Activity Modal */}
			<Modal visible={showActivityModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowActivityModal(false)}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={() => setShowActivityModal(false)}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("activities.addActivity")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<View style={styles.modalContent}>
						{/* Activity Type */}
						<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("activities.activityType")}</Text>
						<View style={styles.activityTypeGrid}>
							{[
								{ value: "CALL", label: t("activities.typeCall"), icon: "call" },
								{ value: "NOTE", label: t("activities.typeNote"), icon: "document-text" },
							].map((type) => (
								<TouchableOpacity
									key={type.value}
									style={[
										styles.activityTypeOption,
										{
											backgroundColor: activityType === type.value ? colors.primary + "20" : colors.card,
											borderColor: activityType === type.value ? colors.primary : colors.border,
										},
									]}
									onPress={() => setActivityType(type.value as any)}>
									<Ionicons name={type.icon as any} size={24} color={activityType === type.value ? colors.primary : colors.textSecondary} />
									<Text
										style={[
											styles.activityTypeLabel,
											{
												color: activityType === type.value ? colors.primary : colors.textSecondary,
											},
										]}>
										{type.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Activity Content */}
						<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("activities.description")}</Text>
						<RNTextInput style={[styles.textArea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder={t("activities.descriptionPlaceholder")} placeholderTextColor={colors.textLight} value={activityContent} onChangeText={setActivityContent} multiline />

						<Button title={t("common.save")} onPress={handleAddActivity} loading={savingActivity} disabled={!activityContent.trim()} />
					</View>
				</SafeAreaView>
			</Modal>

			{/* Add Task Modal */}
			<Modal visible={showTaskModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTaskModal(false)}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={() => setShowTaskModal(false)}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("tasks.addTask")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<ScrollView style={styles.modalContent}>
						{/* Task Title */}
						<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("tasks.taskTitle")}</Text>
						<RNTextInput style={[styles.textInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder={t("tasks.taskTitlePlaceholder")} placeholderTextColor={colors.textLight} value={taskTitle} onChangeText={setTaskTitle} />

						{/* Task Type */}
						<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("tasks.taskType")}</Text>
						<View style={styles.taskTypeGrid}>
							{TASK_TYPE_OPTIONS.map((type) => (
								<TouchableOpacity
									key={type.value}
									style={[
										styles.taskTypeOption,
										{
											backgroundColor: taskType === type.value ? colors.primary + "20" : colors.card,
											borderColor: taskType === type.value ? colors.primary : colors.border,
										},
									]}
									onPress={() => setTaskType(type.value)}>
									<Ionicons name={type.icon as any} size={20} color={taskType === type.value ? colors.primary : colors.textSecondary} />
									<Text
										style={[
											styles.taskTypeLabel,
											{
												color: taskType === type.value ? colors.primary : colors.textSecondary,
											},
										]}>
										{type.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Task Priority */}
						<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("customers.priority")}</Text>
						<View style={styles.priorityGrid}>
							{TASK_PRIORITY_OPTIONS.map((priority) => (
								<TouchableOpacity
									key={priority.value}
									style={[
										styles.priorityOption,
										{
											backgroundColor: taskPriority === priority.value ? priority.color + "20" : colors.card,
											borderColor: taskPriority === priority.value ? priority.color : colors.border,
										},
									]}
									onPress={() => setTaskPriority(priority.value)}>
									<Text
										style={[
											styles.priorityLabel,
											{
												color: taskPriority === priority.value ? priority.color : colors.textSecondary,
											},
										]}>
										{priority.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{/* Due Date */}
						<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("tasks.dueDate")}</Text>
						<RNTextInput style={[styles.textInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textLight} value={taskDueDate} onChangeText={setTaskDueDate} />

						<View style={{ height: Spacing.lg }} />

						<Button title={t("tasks.createTask")} onPress={handleAddTask} loading={savingTask} disabled={!taskTitle.trim() || !taskDueDate} />

						<View style={{ height: 40 }} />
					</ScrollView>
				</SafeAreaView>
			</Modal>
		</SafeAreaView>
	);
}

// Task Card Component
interface TaskCardProps {
	task: Task;
	colors: any;
	t: any;
	onComplete?: () => void;
	onPress: () => void;
	taskTypeOptions: { value: string; label: string; icon: string }[];
	isOverdue?: boolean;
	isCompleted?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, colors, t, onComplete, onPress, taskTypeOptions, isOverdue, isCompleted }) => {
	const typeInfo = taskTypeOptions.find((o) => o.value === task.type);

	return (
		<TouchableOpacity
			style={[
				styles.taskCard,
				{
					backgroundColor: colors.card,
					borderColor: isOverdue ? colors.error : isCompleted ? colors.success : colors.border,
					borderLeftWidth: 3,
				},
			]}
			onPress={onPress}>
			<View style={styles.taskCardContent}>
				<View style={styles.taskCardHeader}>
					{typeInfo && (
						<View style={[styles.taskTypeIcon, { backgroundColor: colors.primary + "15" }]}>
							<Ionicons name={typeInfo.icon as any} size={16} color={colors.primary} />
						</View>
					)}
					<Text
						style={[
							styles.taskTitle,
							{
								color: isCompleted ? colors.textSecondary : colors.text,
								textDecorationLine: isCompleted ? "line-through" : "none",
							},
						]}
						numberOfLines={1}>
						{task.title}
					</Text>
				</View>
				<View style={styles.taskCardFooter}>
					<Text style={[styles.taskDue, { color: isOverdue ? colors.error : colors.textSecondary }]}>
						<Ionicons name="calendar-outline" size={12} /> {new Date(task.due_date).toLocaleDateString("vi-VN")}
					</Text>
					{task.assigned_user && <Text style={[styles.taskAssignee, { color: colors.textLight }]}>{task.assigned_user.name}</Text>}
				</View>
			</View>
			{!isCompleted && onComplete && (
				<TouchableOpacity style={[styles.taskCheckbox, { borderColor: colors.border }]} onPress={onComplete}>
					<Ionicons name="checkmark" size={18} color={colors.textLight} />
				</TouchableOpacity>
			)}
			{isCompleted && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	headerTitleContainer: {
		flex: 1,
		marginHorizontal: Spacing.md,
	},
	headerTitle: {
		fontSize: FontSize.lg,
		fontWeight: "600",
		marginBottom: 4,
	},
	callButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
	},
	managerBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
	},
	salesInfo: {
		flexDirection: "row",
		alignItems: "center",
	},
	salesLabel: {
		fontSize: FontSize.sm,
		marginRight: Spacing.xs,
	},
	salesName: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	assignButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
	},
	tabs: {
		flexDirection: "row",
		borderBottomWidth: 1,
	},
	tab: {
		flex: 1,
		paddingVertical: Spacing.md,
		alignItems: "center",
	},
	tabText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	tabContent: {
		flex: 1,
	},

	// Info Tab
	infoTab: {
		padding: Spacing.lg,
	},
	sectionTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
		marginBottom: Spacing.sm,
		marginTop: Spacing.md,
	},
	infoCard: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		overflow: "hidden",
	},
	infoRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderBottomWidth: 0.5,
		borderBottomColor: "rgba(0,0,0,0.05)",
	},
	infoLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	infoLabel: {
		fontSize: FontSize.sm,
	},
	infoValue: {
		fontSize: FontSize.sm,
		fontWeight: "500",
		maxWidth: "50%",
		textAlign: "right",
	},
	potentialValueContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
	},
	potentialValueLabel: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	potentialValueRange: {
		fontSize: FontSize.xs,
	},
	statusGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	statusOption: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	statusOptionText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},

	// Activities Tab
	activitiesTab: {
		padding: Spacing.lg,
	},
	addButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		marginBottom: Spacing.md,
		gap: Spacing.xs,
	},
	addButtonText: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	activityCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	activityIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	activityContent: {
		flex: 1,
	},
	activityHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		marginBottom: Spacing.xs,
	},
	activityUser: {
		fontSize: FontSize.xs,
	},
	activityAction: {
		fontSize: FontSize.sm,
		lineHeight: 20,
	},
	activityTime: {
		fontSize: FontSize.xs,
		marginTop: Spacing.xs,
	},

	// Notes Tab
	notesTab: {
		padding: Spacing.lg,
	},
	addNoteContainer: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.lg,
	},
	noteInput: {
		minHeight: 80,
		maxHeight: 120,
		fontSize: FontSize.sm,
		marginBottom: Spacing.sm,
		textAlignVertical: "top",
		padding: Spacing.sm,
		borderWidth: 1,
		borderRadius: BorderRadius.md,
	},
	noteTypeSelector: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginBottom: Spacing.sm,
	},
	noteTypeOption: {
		flex: 1,
		paddingVertical: Spacing.sm,
		alignItems: "center",
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	noteTypeText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	noteCard: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	noteContent: {
		fontSize: FontSize.sm,
		lineHeight: 22,
		marginTop: Spacing.xs,
	},
	noteFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: Spacing.sm,
	},
	noteAuthor: {
		fontSize: FontSize.xs,
		fontStyle: "italic",
	},
	noteTime: {
		fontSize: FontSize.xs,
	},

	// Tasks Tab
	tasksTab: {
		padding: Spacing.lg,
	},
	taskGroupTitle: {
		fontSize: FontSize.sm,
		fontWeight: "600",
		marginTop: Spacing.md,
		marginBottom: Spacing.sm,
	},
	taskCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	taskCardContent: {
		flex: 1,
	},
	taskCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	taskTypeIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		justifyContent: "center",
		alignItems: "center",
	},
	taskTitle: {
		fontSize: FontSize.sm,
		fontWeight: "500",
		flex: 1,
	},
	taskCardFooter: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: Spacing.xs,
		marginLeft: 36,
	},
	taskDue: {
		fontSize: FontSize.xs,
	},
	taskAssignee: {
		fontSize: FontSize.xs,
	},
	taskCheckbox: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 2,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: Spacing.sm,
	},

	// Empty state
	emptyText: {
		textAlign: "center",
		fontSize: FontSize.sm,
		marginTop: Spacing.xl,
	},
	errorText: {
		textAlign: "center",
		fontSize: FontSize.md,
		marginTop: Spacing.xl,
	},

	// Modal
	modalContainer: {
		flex: 1,
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	modalTitle: {
		fontSize: FontSize.lg,
		fontWeight: "600",
	},
	modalContent: {
		flex: 1,
		padding: Spacing.lg,
	},
	currentAssignText: {
		fontSize: FontSize.sm,
		marginBottom: Spacing.md,
	},
	memberItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	memberAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	memberInfo: {
		flex: 1,
	},
	memberName: {
		fontSize: FontSize.base,
		fontWeight: "500",
	},
	memberEmail: {
		fontSize: FontSize.sm,
	},

	// Form fields
	fieldLabel: {
		fontSize: FontSize.sm,
		fontWeight: "600",
		marginBottom: Spacing.sm,
		marginTop: Spacing.md,
	},
	textInput: {
		fontSize: FontSize.sm,
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	textArea: {
		fontSize: FontSize.sm,
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		minHeight: 100,
		textAlignVertical: "top",
	},
	activityTypeGrid: {
		flexDirection: "row",
		gap: Spacing.md,
	},
	activityTypeOption: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		gap: Spacing.xs,
	},
	activityTypeLabel: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	taskTypeGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	taskTypeOption: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		gap: Spacing.xs,
	},
	taskTypeLabel: {
		fontSize: FontSize.sm,
	},
	priorityGrid: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	priorityOption: {
		flex: 1,
		alignItems: "center",
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	priorityLabel: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
});
