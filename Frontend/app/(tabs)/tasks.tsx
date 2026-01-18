import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions, TextInput as RNTextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Task, User, Lead, Opportunity, GroupedTasks, TaskType } from "@/types";
import { Loading, EmptyState, Badge, Button, TextInput } from "@/components/ui";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Task type configuration
const TASK_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
	CALL: { icon: "call", color: "#10B981", label: "tasks.typeCall" },
	MEETING: { icon: "calendar", color: "#3B82F6", label: "tasks.typeMeeting" },
	EMAIL: { icon: "mail", color: "#8B5CF6", label: "tasks.typeEmail" },
	DEMO: { icon: "desktop", color: "#F59E0B", label: "tasks.typeDemo" },
	FOLLOW_UP: { icon: "refresh", color: "#06B6D4", label: "tasks.typeFollowUp" },
	OTHER: { icon: "ellipsis-horizontal", color: "#6B7280", label: "tasks.typeOther" },
};

type TabType = "today" | "upcoming" | "overdue";
type ManagerTabType = "all" | "overdue" | "bySales";

export default function TasksScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { isManager, user, isAuthenticated } = useAuth();
	const { t } = useTranslation();

	// Task data states
	const [groupedTasks, setGroupedTasks] = useState<GroupedTasks>({
		today: [],
		overdue: [],
		upcoming: [],
		counts: { today: 0, overdue: 0, upcoming: 0 },
	});
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Tab states
	const [activeTab, setActiveTab] = useState<TabType>("today");
	const [managerTab, setManagerTab] = useState<ManagerTabType>("all");
	const [selectedSalesId, setSelectedSalesId] = useState<number | null>(null);

	// Create task modal states
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [leads, setLeads] = useState<Lead[]>([]);
	const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

	// Form states
	const [taskTitle, setTaskTitle] = useState("");
	const [taskType, setTaskType] = useState<TaskType>("CALL");
	const [selectedLead, setSelectedLead] = useState<number | null>(null);
	const [selectedOpportunity, setSelectedOpportunity] = useState<number | null>(null);
	const [taskDueDate, setTaskDueDate] = useState(new Date());
	const [taskDueTime, setTaskDueTime] = useState(new Date());
	const [selectedAssignee, setSelectedAssignee] = useState<number | null>(null);
	const [taskNotes, setTaskNotes] = useState("");
	const [creating, setCreating] = useState(false);

	// Picker states
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showTimePicker, setShowTimePicker] = useState(false);
	const [showLeadPicker, setShowLeadPicker] = useState(false);
	const [showOpportunityPicker, setShowOpportunityPicker] = useState(false);
	const [leadSearchQuery, setLeadSearchQuery] = useState("");

	// Pre-fill context (when creating from customer/opportunity page)
	const [contextLeadId, setContextLeadId] = useState<number | null>(null);
	const [contextOpportunityId, setContextOpportunityId] = useState<number | null>(null);

	// Fetch team members for manager
	const fetchTeamMembers = async () => {
		if (!isManager) return;
		try {
			const response = await api.getTeamMembers();
			setTeamMembers((response as any).data || []);
		} catch (error) {
			console.error("Error fetching team members:", error);
		}
	};

	// Fetch leads
	const fetchLeads = async () => {
		try {
			const response = await api.getLeads({ per_page: 100 });
			setLeads((response as any).data || []);
		} catch (error) {
			console.error("Error fetching leads:", error);
		}
	};

	// Fetch opportunities for selected lead
	const fetchOpportunities = async (leadId: number) => {
		try {
			const response = await api.getOpportunities({ lead_id: leadId });
			setOpportunities((response as any).data || []);
		} catch (error) {
			console.error("Error fetching opportunities:", error);
		}
	};

	useEffect(() => {
		if (!isAuthenticated) return;
		fetchTeamMembers();
		fetchLeads();
	}, [isManager, isAuthenticated]);

	useEffect(() => {
		if (selectedLead) {
			fetchOpportunities(selectedLead);
		} else {
			setOpportunities([]);
			setSelectedOpportunity(null);
		}
	}, [selectedLead]);

	// Set default assignee for sales
	useEffect(() => {
		if (!isManager && user) {
			setSelectedAssignee(user.id);
		}
	}, [isManager, user]);

	const fetchTasks = async (isRefresh = false) => {
		if (!isAuthenticated) return;
		try {
			if (!isRefresh) setLoading(true);
			const params: any = { per_page: 100 };

			// Manager filter by sales
			if (isManager && selectedSalesId) {
				params.assigned_to = selectedSalesId;
			}

			const grouped = await api.getGroupedTasks(params);
			setGroupedTasks(grouped);
		} catch (error) {
			console.error("Error fetching tasks:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (!isAuthenticated) return;
			fetchTasks();
		}, [isAuthenticated, selectedSalesId]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchTasks(true);
	};

	const handleCompleteTask = async (task: Task) => {
		// Manager cannot complete task for Sales
		if (isManager && task.assigned_user && task.assigned_user.id !== user?.id) {
			Alert.alert(t("tasks.cannotComplete"), t("tasks.managerCannotComplete"));
			return;
		}

		Alert.alert(t("tasks.completeTask"), t("tasks.completeConfirm"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("tasks.markComplete"),
				onPress: async () => {
					try {
						await api.completeTask(task.id);
						Alert.alert(t("common.success"), t("tasks.taskCompleted"), [
							{ text: t("common.ok") },
							{
								text: t("tasks.createAnother"),
								onPress: () => {
									// Pre-fill with same customer
									if (task.lead_id) {
										setSelectedLead(task.lead_id);
									}
									setShowCreateModal(true);
								},
							},
						]);
						fetchTasks(true);
					} catch (error: any) {
						Alert.alert(t("common.error"), error.message || t("tasks.cannotComplete"));
					}
				},
			},
		]);
	};

	const resetCreateForm = () => {
		setTaskTitle("");
		setTaskType("CALL");
		setSelectedLead(contextLeadId);
		setSelectedOpportunity(contextOpportunityId);
		setTaskDueDate(new Date());
		setTaskDueTime(new Date());
		if (!isManager) {
			setSelectedAssignee(user?.id || null);
		} else {
			setSelectedAssignee(null);
		}
		setTaskNotes("");
		setLeadSearchQuery("");
	};

	const handleCreateTask = async () => {
		// Validation
		if (!taskTitle.trim()) {
			Alert.alert(t("common.error"), t("tasks.enterTaskTitle"));
			return;
		}
		if (!selectedLead) {
			Alert.alert(t("common.error"), t("tasks.selectCustomerRequired"));
			return;
		}

		// Combine date and time
		const dueDateTime = new Date(taskDueDate);
		dueDateTime.setHours(taskDueTime.getHours(), taskDueTime.getMinutes());

		// Check if deadline is in past
		if (dueDateTime < new Date()) {
			Alert.alert(t("common.error"), t("tasks.deadlineInPast"));
			return;
		}

		setCreating(true);
		try {
			const taskData: any = {
				title: taskTitle,
				type: taskType,
				lead_id: selectedLead,
				due_date: dueDateTime.toISOString(),
				notes: taskNotes || undefined,
			};

			if (selectedOpportunity) {
				taskData.opportunity_id = selectedOpportunity;
			}

			if (selectedAssignee) {
				taskData.assigned_to = selectedAssignee;
			}

			await api.createTask(taskData);

			Alert.alert(t("common.success"), t("tasks.taskCreated"), [
				{
					text: t("common.ok"),
					onPress: () => {
						resetCreateForm();
						setShowCreateModal(false);
						fetchTasks(true);
					},
				},
				{
					text: t("tasks.createAnother"),
					onPress: () => {
						resetCreateForm();
						fetchTasks(true);
					},
				},
			]);
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("tasks.cannotCreateTask"));
		} finally {
			setCreating(false);
		}
	};

	const handleDateChange = (event: any, date?: Date) => {
		if (Platform.OS === "android") {
			setShowDatePicker(false);
		}
		if (date) {
			setTaskDueDate(date);
		}
	};

	const handleTimeChange = (event: any, time?: Date) => {
		if (Platform.OS === "android") {
			setShowTimePicker(false);
		}
		if (time) {
			setTaskDueTime(time);
		}
	};

	const setQuickDate = (daysFromNow: number) => {
		const date = new Date();
		date.setDate(date.getDate() + daysFromNow);
		setTaskDueDate(date);
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		if (date.toDateString() === today.toDateString()) {
			return t("common.today");
		}
		if (date.toDateString() === tomorrow.toDateString()) {
			return t("common.tomorrow");
		}
		return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
	};

	const getTaskTypeConfig = (type?: TaskType) => {
		return TASK_TYPE_CONFIG[type || "OTHER"] || TASK_TYPE_CONFIG.OTHER;
	};

	const isOverdueTask = (task: Task) => task.status !== "DONE" && task.computed_status === "OVERDUE";

	const getCurrentTasks = (): Task[] => {
		if (isManager) {
			switch (managerTab) {
				case "all":
					return [...groupedTasks.today, ...groupedTasks.upcoming, ...groupedTasks.overdue];
				case "overdue":
					return groupedTasks.overdue;
				case "bySales":
					// Already filtered by selectedSalesId in fetch
					return [...groupedTasks.today, ...groupedTasks.upcoming, ...groupedTasks.overdue];
				default:
					return [];
			}
		} else {
			switch (activeTab) {
				case "today":
					return groupedTasks.today;
				case "upcoming":
					return groupedTasks.upcoming;
				case "overdue":
					return groupedTasks.overdue;
				default:
					return [];
			}
		}
	};

	const renderTaskItem = ({ item }: { item: Task }) => {
		const typeConfig = getTaskTypeConfig(item.type);
		const isOverdue = isOverdueTask(item);
		const isDone = item.status === "DONE";
		// Only assigned user can complete task
		const canComplete = !isDone && item.assigned_to === user?.id;

		return (
			<TouchableOpacity
				style={[
					styles.taskCard,
					{
						backgroundColor: isDone ? colors.surface : colors.card,
						borderColor: isOverdue ? colors.error : colors.border,
						borderWidth: isOverdue ? 1.5 : 1,
					},
				]}
				onPress={() => router.push(`/task/${item.id}`)}
				activeOpacity={0.7}>
				{/* Checkbox - Only show checkable state for assigned user */}
				<TouchableOpacity
					style={[
						styles.checkbox,
						{
							borderColor: isDone ? colors.success : isOverdue ? colors.error : colors.border,
							backgroundColor: isDone ? colors.success : "transparent",
						},
					]}
					onPress={() => canComplete && handleCompleteTask(item)}
					disabled={!canComplete}>
					{isDone && <Ionicons name="checkmark" size={16} color={colors.white} />}
				</TouchableOpacity>

				{/* Task type icon */}
				<View style={[styles.typeIcon, { backgroundColor: typeConfig.color + "15" }]}>
					<Ionicons name={typeConfig.icon as any} size={18} color={typeConfig.color} />
				</View>

				{/* Content */}
				<View style={styles.taskContent}>
					{/* Title */}
					<Text style={[styles.taskTitle, { color: colors.text }, isDone && styles.taskCompleted]} numberOfLines={2}>
						{item.title}
					</Text>

					{/* Customer */}
					{item.lead && (
						<View style={styles.taskMeta}>
							<Ionicons name="person" size={12} color={colors.textLight} />
							<Text style={[styles.taskMetaText, { color: colors.textSecondary }]}>{item.lead.full_name}</Text>
						</View>
					)}

					{/* Opportunity */}
					{item.opportunity && (
						<View style={styles.taskMeta}>
							<Ionicons name="briefcase" size={12} color={colors.primary} />
							<Text style={[styles.taskMetaText, { color: colors.primary }]}>
								{item.opportunity.stage}
								{item.opportunity.estimated_value ? ` - ${(item.opportunity.estimated_value / 1000000).toFixed(0)}tr` : ""}
							</Text>
						</View>
					)}

					{/* Footer: Time + Assignee (for manager) */}
					<View style={styles.taskFooter}>
						<View style={styles.taskMeta}>
							<Ionicons name="time" size={12} color={isOverdue ? colors.error : colors.textLight} />
							<Text style={[styles.taskMetaText, { color: isOverdue ? colors.error : colors.textSecondary }]}>
								{formatTime(item.due_date)} {formatDate(item.due_date)}
							</Text>
						</View>

						{isManager && item.assigned_user && <Text style={[styles.assigneeText, { color: colors.textLight }]}>{item.assigned_user.name}</Text>}
					</View>
				</View>

				{/* Overdue badge */}
				{isOverdue && (
					<View style={[styles.overdueBadge, { backgroundColor: colors.error }]}>
						<Ionicons name="alert" size={12} color="#fff" />
					</View>
				)}
			</TouchableOpacity>
		);
	};

	const renderSalesTab = () => (
		<View style={styles.tabContainer}>
			{(["today", "upcoming", "overdue"] as TabType[]).map((tab) => {
				const count = tab === "today" ? groupedTasks.counts.today : tab === "upcoming" ? groupedTasks.counts.upcoming : groupedTasks.counts.overdue;
				const isActive = activeTab === tab;
				const isOverdueTab = tab === "overdue";

				return (
					<TouchableOpacity
						key={tab}
						style={[
							styles.tab,
							{
								backgroundColor: isActive ? colors.primary : colors.surface,
								borderColor: isOverdueTab && count > 0 ? colors.error : colors.border,
							},
						]}
						onPress={() => setActiveTab(tab)}>
						<Text style={[styles.tabText, { color: isActive ? colors.white : colors.text }]}>{t(`tasks.${tab}`)}</Text>
						{count > 0 && (
							<View
								style={[
									styles.tabBadge,
									{
										backgroundColor: isActive ? colors.white : isOverdueTab ? colors.error : colors.primary,
									},
								]}>
								<Text
									style={[
										styles.tabBadgeText,
										{
											color: isActive ? colors.primary : isOverdueTab ? colors.white : colors.white,
										},
									]}>
									{count}
								</Text>
							</View>
						)}
					</TouchableOpacity>
				);
			})}
		</View>
	);

	const renderManagerTab = () => (
		<View style={styles.tabContainer}>
			{(["all", "overdue", "bySales"] as ManagerTabType[]).map((tab) => {
				const isActive = managerTab === tab;
				const count = tab === "overdue" ? groupedTasks.counts.overdue : 0;

				return (
					<TouchableOpacity
						key={tab}
						style={[
							styles.tab,
							{
								backgroundColor: isActive ? colors.primary : colors.surface,
								borderColor: tab === "overdue" && count > 0 ? colors.error : colors.border,
							},
						]}
						onPress={() => {
							setManagerTab(tab);
							if (tab !== "bySales") {
								setSelectedSalesId(null);
							}
						}}>
						<Text style={[styles.tabText, { color: isActive ? colors.white : colors.text }]}>{tab === "all" ? t("common.all") : tab === "overdue" ? t("tasks.overdue") : t("tasks.bySales")}</Text>
						{count > 0 && tab === "overdue" && (
							<View style={[styles.tabBadge, { backgroundColor: isActive ? colors.white : colors.error }]}>
								<Text style={[styles.tabBadgeText, { color: isActive ? colors.primary : colors.white }]}>{count}</Text>
							</View>
						)}
					</TouchableOpacity>
				);
			})}
		</View>
	);

	const renderSalesFilter = () => {
		if (!isManager || managerTab !== "bySales") return null;

		return (
			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.salesFilterContainer} contentContainerStyle={styles.salesFilterContent}>
				<TouchableOpacity
					style={[
						styles.salesChip,
						{
							backgroundColor: !selectedSalesId ? colors.primary : colors.surface,
							borderColor: colors.border,
						},
					]}
					onPress={() => setSelectedSalesId(null)}>
					<Text style={[styles.salesChipText, { color: !selectedSalesId ? colors.white : colors.text }]}>{t("common.all")}</Text>
				</TouchableOpacity>
				{teamMembers.map((member) => (
					<TouchableOpacity
						key={member.id}
						style={[
							styles.salesChip,
							{
								backgroundColor: selectedSalesId === member.id ? colors.primary : colors.surface,
								borderColor: colors.border,
							},
						]}
						onPress={() => setSelectedSalesId(member.id)}>
						<Text
							style={[
								styles.salesChipText,
								{
									color: selectedSalesId === member.id ? colors.white : colors.text,
								},
							]}>
							{member.name}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>
		);
	};

	const renderTaskTypeSelector = () => (
		<View style={styles.typeSelector}>
			{Object.entries(TASK_TYPE_CONFIG).map(([type, config]) => {
				const isSelected = taskType === type;
				return (
					<TouchableOpacity
						key={type}
						style={[
							styles.typeOption,
							{
								backgroundColor: isSelected ? config.color + "20" : colors.surface,
								borderColor: isSelected ? config.color : colors.border,
							},
						]}
						onPress={() => setTaskType(type as TaskType)}>
						<Ionicons name={config.icon as any} size={20} color={config.color} />
						<Text style={[styles.typeOptionText, { color: isSelected ? config.color : colors.text }]}>{t(config.label)}</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);

	const currentTasks = getCurrentTasks();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Text style={[styles.title, { color: colors.text }]}>{t("tasks.title")}</Text>
					{groupedTasks.counts.overdue > 0 && (
						<View style={[styles.headerBadge, { backgroundColor: colors.error }]}>
							<Text style={styles.headerBadgeText}>{groupedTasks.counts.overdue}</Text>
						</View>
					)}
				</View>
				<TouchableOpacity
					style={[styles.addButton, { backgroundColor: colors.primary }]}
					onPress={() => {
						resetCreateForm();
						setShowCreateModal(true);
					}}>
					<Ionicons name="add" size={24} color={colors.white} />
				</TouchableOpacity>
			</View>

			{/* Tabs */}
			{isManager ? renderManagerTab() : renderSalesTab()}

			{/* Sales filter for manager */}
			{renderSalesFilter()}

			{/* Task list */}
			{loading ? <Loading /> : currentTasks.length === 0 ? <EmptyState icon="checkbox-outline" title={t("tasks.noTasks")} message={t("tasks.noTasksMessage")} /> : <FlatList data={currentTasks} renderItem={renderTaskItem} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />} showsVerticalScrollIndicator={false} />}

			{/* Create Task Modal */}
			<Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					{/* Modal Header */}
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={() => setShowCreateModal(false)}>
							<Text style={[styles.modalCancelText, { color: colors.error }]}>{t("common.cancel")}</Text>
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{isManager ? t("tasks.assignTask") : t("tasks.createTask")}</Text>
						<TouchableOpacity onPress={handleCreateTask} disabled={creating}>
							<Text style={[styles.modalSaveText, { color: creating ? colors.textLight : colors.primary }]}>{t("common.save")}</Text>
						</TouchableOpacity>
					</View>

					<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Task Title */}
							<View style={styles.formSection}>
								<TextInput label={t("tasks.taskTitle") + " *"} placeholder={t("tasks.taskTitlePlaceholder")} value={taskTitle} onChangeText={setTaskTitle} autoFocus />
							</View>

							{/* Task Type */}
							<View style={styles.formSection}>
								<Text style={[styles.formLabel, { color: colors.text }]}>{t("tasks.taskType")}</Text>
								{renderTaskTypeSelector()}
							</View>

							{/* Customer */}
							<View style={styles.formSection}>
								<Text style={[styles.formLabel, { color: colors.text }]}>{t("tasks.relatedCustomer")} *</Text>
								<TouchableOpacity
									style={[
										styles.selectButton,
										{
											backgroundColor: colors.inputBackground,
											borderColor: colors.border,
										},
									]}
									onPress={() => setShowLeadPicker(true)}>
									<Ionicons name="person" size={20} color={colors.primary} />
									<Text
										style={[
											styles.selectButtonText,
											{
												color: selectedLead ? colors.text : colors.textLight,
												flex: 1,
											},
										]}>
										{selectedLead ? leads.find((l) => l.id === selectedLead)?.full_name : t("tasks.selectCustomer")}
									</Text>
									{selectedLead && (
										<TouchableOpacity onPress={() => setSelectedLead(null)}>
											<Ionicons name="close-circle" size={20} color={colors.textLight} />
										</TouchableOpacity>
									)}
								</TouchableOpacity>
							</View>

							{/* Opportunity (only show if customer has opportunities) */}
							{selectedLead && opportunities.length > 0 && (
								<View style={styles.formSection}>
									<Text style={[styles.formLabel, { color: colors.text }]}>{t("opportunities.title")}</Text>
									<TouchableOpacity
										style={[
											styles.selectButton,
											{
												backgroundColor: colors.inputBackground,
												borderColor: colors.border,
											},
										]}
										onPress={() => setShowOpportunityPicker(true)}>
										<Ionicons name="briefcase" size={20} color={colors.primary} />
										<Text
											style={[
												styles.selectButtonText,
												{
													color: selectedOpportunity ? colors.text : colors.textLight,
													flex: 1,
												},
											]}>
											{selectedOpportunity ? opportunities.find((o) => o.id === selectedOpportunity)?.stage + (opportunities.find((o) => o.id === selectedOpportunity)?.estimated_value ? ` - ${(opportunities.find((o) => o.id === selectedOpportunity)!.estimated_value! / 1000000).toFixed(0)}tr` : "") || t("opportunities.detail") : t("tasks.selectOpportunity")}
										</Text>
										{selectedOpportunity && (
											<TouchableOpacity onPress={() => setSelectedOpportunity(null)}>
												<Ionicons name="close-circle" size={20} color={colors.textLight} />
											</TouchableOpacity>
										)}
									</TouchableOpacity>
								</View>
							)}

							{/* Deadline */}
							<View style={styles.formSection}>
								<Text style={[styles.formLabel, { color: colors.text }]}>{t("tasks.dueDate")} *</Text>

								{/* Quick date options */}
								<View style={styles.quickDateContainer}>
									<TouchableOpacity style={[styles.quickDateOption, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]} onPress={() => setQuickDate(0)}>
										<Text style={[styles.quickDateText, { color: colors.primary }]}>{t("common.today")}</Text>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.quickDateOption, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setQuickDate(1)}>
										<Text style={[styles.quickDateText, { color: colors.text }]}>{t("common.tomorrow")}</Text>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.quickDateOption, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setQuickDate(3)}>
										<Text style={[styles.quickDateText, { color: colors.text }]}>{t("tasks.in3Days")}</Text>
									</TouchableOpacity>
								</View>

								{/* Date & Time pickers */}
								<View style={styles.dateTimeRow}>
									<TouchableOpacity
										style={[
											styles.dateTimeButton,
											{
												backgroundColor: colors.inputBackground,
												borderColor: colors.border,
												flex: 1,
											},
										]}
										onPress={() => setShowDatePicker(true)}>
										<Ionicons name="calendar" size={18} color={colors.primary} />
										<Text style={[styles.dateTimeText, { color: colors.text }]}>{taskDueDate.toLocaleDateString("vi-VN")}</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[
											styles.dateTimeButton,
											{
												backgroundColor: colors.inputBackground,
												borderColor: colors.border,
												flex: 1,
											},
										]}
										onPress={() => setShowTimePicker(true)}>
										<Ionicons name="time" size={18} color={colors.primary} />
										<Text style={[styles.dateTimeText, { color: colors.text }]}>
											{taskDueTime.toLocaleTimeString("vi-VN", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Assignee (Manager only) */}
							{isManager && (
								<View style={styles.formSection}>
									<Text style={[styles.formLabel, { color: colors.text }]}>{t("tasks.assignToSales")}</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assigneeList}>
										{teamMembers.map((member) => (
											<TouchableOpacity
												key={member.id}
												style={[
													styles.assigneeChip,
													{
														backgroundColor: selectedAssignee === member.id ? colors.primary : colors.surface,
														borderColor: selectedAssignee === member.id ? colors.primary : colors.border,
													},
												]}
												onPress={() => setSelectedAssignee(selectedAssignee === member.id ? null : member.id)}>
												<Text
													style={[
														styles.assigneeChipText,
														{
															color: selectedAssignee === member.id ? colors.white : colors.text,
														},
													]}>
													{member.name}
												</Text>
											</TouchableOpacity>
										))}
									</ScrollView>
								</View>
							)}

							{/* Notes */}
							<View style={styles.formSection}>
								<TextInput label={t("tasks.notes")} placeholder={t("tasks.notesPlaceholder")} value={taskNotes} onChangeText={setTaskNotes} multiline numberOfLines={3} />
							</View>

							{/* Spacer for bottom padding */}
							<View style={{ height: 20 }} />
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>

				{/* Date Picker */}
				{Platform.OS === "ios" && showDatePicker && (
					<Modal transparent animationType="slide" visible={showDatePicker}>
						<View style={styles.pickerModal}>
							<View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
								<View style={styles.pickerHeader}>
									<TouchableOpacity onPress={() => setShowDatePicker(false)}>
										<Text style={[styles.pickerButton, { color: colors.error }]}>{t("common.cancel")}</Text>
									</TouchableOpacity>
									<TouchableOpacity onPress={() => setShowDatePicker(false)}>
										<Text style={[styles.pickerButton, { color: colors.primary }]}>{t("common.done")}</Text>
									</TouchableOpacity>
								</View>
								<DateTimePicker value={taskDueDate} mode="date" display="spinner" onChange={handleDateChange} minimumDate={new Date()} locale="vi-VN" />
							</View>
						</View>
					</Modal>
				)}
				{Platform.OS === "android" && showDatePicker && <DateTimePicker value={taskDueDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />}

				{/* Time Picker */}
				{Platform.OS === "ios" && showTimePicker && (
					<Modal transparent animationType="slide" visible={showTimePicker}>
						<View style={styles.pickerModal}>
							<View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
								<View style={styles.pickerHeader}>
									<TouchableOpacity onPress={() => setShowTimePicker(false)}>
										<Text style={[styles.pickerButton, { color: colors.error }]}>{t("common.cancel")}</Text>
									</TouchableOpacity>
									<TouchableOpacity onPress={() => setShowTimePicker(false)}>
										<Text style={[styles.pickerButton, { color: colors.primary }]}>{t("common.done")}</Text>
									</TouchableOpacity>
								</View>
								<DateTimePicker value={taskDueTime} mode="time" display="spinner" onChange={handleTimeChange} locale="vi-VN" />
							</View>
						</View>
					</Modal>
				)}
				{Platform.OS === "android" && showTimePicker && <DateTimePicker value={taskDueTime} mode="time" display="default" onChange={handleTimeChange} />}
			</Modal>

			{/* Lead Picker Modal */}
			<Modal visible={showLeadPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLeadPicker(false)}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={() => setShowLeadPicker(false)}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("tasks.selectCustomer")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<View style={styles.searchContainer}>
						<View style={[styles.searchInputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
							<Ionicons name="search" size={20} color={colors.textLight} />
							<RNTextInput style={[styles.searchInput, { color: colors.text }]} placeholder={t("customers.searchPlaceholder")} placeholderTextColor={colors.placeholder} value={leadSearchQuery} onChangeText={setLeadSearchQuery} />
							{leadSearchQuery ? (
								<TouchableOpacity onPress={() => setLeadSearchQuery("")}>
									<Ionicons name="close-circle" size={20} color={colors.textLight} />
								</TouchableOpacity>
							) : null}
						</View>
					</View>

					<FlatList
						data={leads.filter((lead) => !leadSearchQuery || lead.full_name.toLowerCase().includes(leadSearchQuery.toLowerCase()) || (lead.company && lead.company.toLowerCase().includes(leadSearchQuery.toLowerCase())))}
						keyExtractor={(item) => item.id.toString()}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									styles.optionItem,
									{
										backgroundColor: selectedLead === item.id ? colors.primary + "15" : colors.card,
										borderColor: colors.border,
									},
								]}
								onPress={() => {
									setSelectedLead(item.id);
									setShowLeadPicker(false);
								}}>
								<View style={[styles.optionAvatar, { backgroundColor: colors.primary + "20" }]}>
									<Text style={[styles.optionAvatarText, { color: colors.primary }]}>{item.full_name.charAt(0).toUpperCase()}</Text>
								</View>
								<View style={styles.optionInfo}>
									<Text style={[styles.optionName, { color: colors.text }]}>{item.full_name}</Text>
									{item.company && <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>{item.company}</Text>}
								</View>
								{selectedLead === item.id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
							</TouchableOpacity>
						)}
						contentContainerStyle={styles.optionListContent}
						ListEmptyComponent={
							<View style={styles.emptyList}>
								<Text style={[styles.emptyText, { color: colors.textLight }]}>{t("customers.noCustomers")}</Text>
							</View>
						}
					/>
				</SafeAreaView>
			</Modal>

			{/* Opportunity Picker Modal */}
			<Modal visible={showOpportunityPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowOpportunityPicker(false)}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={() => setShowOpportunityPicker(false)}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("tasks.selectOpportunity")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<FlatList
						data={opportunities}
						keyExtractor={(item) => item.id.toString()}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={[
									styles.optionItem,
									{
										backgroundColor: selectedOpportunity === item.id ? colors.primary + "15" : colors.card,
										borderColor: colors.border,
									},
								]}
								onPress={() => {
									setSelectedOpportunity(item.id);
									setShowOpportunityPicker(false);
								}}>
								<View style={[styles.optionAvatar, { backgroundColor: colors.warning + "20" }]}>
									<Ionicons name="briefcase" size={20} color={colors.warning} />
								</View>
								<View style={styles.optionInfo}>
									<Text style={[styles.optionName, { color: colors.text }]}>
										{item.stage} #{item.id}
									</Text>
									<Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>
										{item.stage} • {item.estimated_value ? `${(item.estimated_value / 1000000).toFixed(0)}tr` : "N/A"}
									</Text>
								</View>
								{selectedOpportunity === item.id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
							</TouchableOpacity>
						)}
						contentContainerStyle={styles.optionListContent}
						ListEmptyComponent={
							<View style={styles.emptyList}>
								<Text style={[styles.emptyText, { color: colors.textLight }]}>{t("opportunities.noOpportunities")}</Text>
							</View>
						}
					/>
				</SafeAreaView>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
	},
	headerBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
		minWidth: 22,
		alignItems: "center",
	},
	headerBadgeText: {
		color: "#fff",
		fontSize: FontSize.xs,
		fontWeight: "bold",
	},
	addButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
	},
	tabContainer: {
		flexDirection: "row",
		paddingHorizontal: Spacing.lg,
		marginBottom: Spacing.md,
		gap: Spacing.sm,
	},
	tab: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: 6,
	},
	tabText: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	tabBadge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
		minWidth: 18,
		alignItems: "center",
	},
	tabBadgeText: {
		fontSize: FontSize.xs,
		fontWeight: "bold",
	},
	salesFilterContainer: {
		marginBottom: Spacing.md,
		maxHeight: 50,
	},
	salesFilterContent: {
		paddingHorizontal: Spacing.lg,
		gap: Spacing.sm,
		flexDirection: "row",
		alignItems: "center",
	},
	salesChip: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
		minHeight: 36,
		justifyContent: "center",
		alignItems: "center",
	},
	salesChipText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	taskCard: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.md,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 2,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.sm,
	},
	typeIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.sm,
	},
	taskContent: {
		flex: 1,
	},
	taskTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
		marginBottom: 4,
	},
	taskCompleted: {
		textDecorationLine: "line-through",
		opacity: 0.5,
	},
	taskMeta: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 2,
		gap: 4,
	},
	taskMetaText: {
		fontSize: FontSize.sm,
	},
	taskFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 4,
	},
	assigneeText: {
		fontSize: FontSize.xs,
	},
	overdueBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	// Modal styles
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
	modalCancelText: {
		fontSize: FontSize.md,
		fontWeight: "500",
	},
	modalSaveText: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	modalContent: {
		flex: 1,
		padding: Spacing.lg,
	},
	formSection: {
		marginBottom: Spacing.lg,
	},
	formLabel: {
		fontSize: FontSize.sm,
		fontWeight: "600",
		marginBottom: Spacing.sm,
	},
	typeSelector: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	typeOption: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		gap: 6,
	},
	typeOptionText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	selectButton: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	selectButtonText: {
		fontSize: FontSize.base,
	},
	quickDateContainer: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginBottom: Spacing.sm,
	},
	quickDateOption: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	quickDateText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	dateTimeRow: {
		flexDirection: "row",
		gap: Spacing.sm,
	},
	dateTimeButton: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		gap: Spacing.sm,
	},
	dateTimeText: {
		fontSize: FontSize.base,
	},
	assigneeList: {
		marginTop: Spacing.xs,
	},
	assigneeChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
		marginRight: Spacing.sm,
	},
	assigneeChipText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	submitButton: {
		marginTop: Spacing.lg,
		marginBottom: Spacing.xl,
	},
	// Picker modal
	pickerModal: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	pickerContainer: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 20,
	},
	pickerHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	pickerButton: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	// Search
	searchContainer: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	searchInputContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	searchInput: {
		flex: 1,
		fontSize: FontSize.base,
		paddingVertical: Spacing.sm,
		marginLeft: Spacing.sm,
	},
	// Option list
	optionListContent: {
		paddingHorizontal: Spacing.lg,
	},
	optionItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	optionAvatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	optionAvatarText: {
		fontSize: FontSize.lg,
		fontWeight: "600",
	},
	optionInfo: {
		flex: 1,
	},
	optionName: {
		fontSize: FontSize.base,
		fontWeight: "500",
	},
	optionSubtext: {
		fontSize: FontSize.sm,
		marginTop: 2,
	},
	emptyList: {
		padding: Spacing.xl,
		alignItems: "center",
	},
	emptyText: {
		fontSize: FontSize.base,
	},
});
