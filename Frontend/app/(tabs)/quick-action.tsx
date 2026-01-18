import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, ScrollView, Alert, FlatList, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Button, TextInput } from "@/components/ui";
import { Lead } from "@/types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type QuickActionType = "customer" | "task" | "note" | null;

// Predefined lead sources
const LEAD_SOURCES = [
	{ value: "website", label: "Website" },
	{ value: "facebook", label: "Facebook" },
	{ value: "zalo", label: "Zalo" },
	{ value: "hotline", label: "Hotline" },
	{ value: "referral", label: "Giới thiệu" },
	{ value: "returning", label: "Khách cũ" },
	{ value: "other", label: "Khác" },
];

// Note types
const NOTE_TYPES = [
	{ value: "call", label: "Cuộc gọi", icon: "call-outline" },
	{ value: "meeting", label: "Gặp trực tiếp", icon: "people-outline" },
	{ value: "email", label: "Email", icon: "mail-outline" },
	{ value: "other", label: "Khác", icon: "chatbubble-outline" },
];

// Task types
const TASK_TYPES = [
	{ value: "call", label: "Gọi điện", icon: "call-outline" },
	{ value: "meeting", label: "Gặp mặt", icon: "people-outline" },
	{ value: "email", label: "Gửi email", icon: "mail-outline" },
	{ value: "follow_up", label: "Follow-up", icon: "refresh-outline" },
	{ value: "demo", label: "Demo", icon: "desktop-outline" },
	{ value: "other", label: "Khác", icon: "checkbox-outline" },
];

export default function QuickActionScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { isSales, isAuthenticated } = useAuth();
	const { t } = useTranslation();

	const [activeAction, setActiveAction] = useState<QuickActionType>(null);
	const [loading, setLoading] = useState(false);
	const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

	// Customer form state
	const [customerName, setCustomerName] = useState("");
	const [customerPhone, setCustomerPhone] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerSource, setCustomerSource] = useState("");
	const [customerSourceNote, setCustomerSourceNote] = useState("");
	const [customerNote, setCustomerNote] = useState("");
	const [showSourcePicker, setShowSourcePicker] = useState(false);

	// Task form state
	const [taskTitle, setTaskTitle] = useState("");
	const [taskType, setTaskType] = useState("call");
	const [taskDueDate, setTaskDueDate] = useState("");
	const [taskNote, setTaskNote] = useState("");
	const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
	const [showLeadPicker, setShowLeadPicker] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
	const [showTaskTypePicker, setShowTaskTypePicker] = useState(false);

	// Note form state
	const [noteContent, setNoteContent] = useState("");
	const [noteType, setNoteType] = useState("call");
	const [noteLeadId, setNoteLeadId] = useState<number | null>(null);
	const [showNoteLeadPicker, setShowNoteLeadPicker] = useState(false);
	const [showNoteTypePicker, setShowNoteTypePicker] = useState(false);

	// Shared state
	const [leads, setLeads] = useState<Lead[]>([]);
	const [leadSearchQuery, setLeadSearchQuery] = useState("");

	useEffect(() => {
		if (!isAuthenticated) return;
		fetchLeads();
	}, [isAuthenticated]);

	const fetchLeads = async () => {
		if (!isAuthenticated) return;
		try {
			const response = await api.getLeads({});
			setLeads((response as any).data || []);
		} catch (error) {
			console.error("Error fetching leads:", error);
		}
	};

	// Animation
	const openSheet = () => {
		Animated.spring(sheetAnim, {
			toValue: 0,
			useNativeDriver: true,
			tension: 65,
			friction: 11,
		}).start();
	};

	const closeSheet = (callback?: () => void) => {
		Animated.timing(sheetAnim, {
			toValue: SCREEN_HEIGHT,
			duration: 250,
			useNativeDriver: true,
		}).start(() => {
			if (callback) callback();
		});
	};

	const handleDateChange = (event: any, date?: Date) => {
		if (Platform.OS === "android") {
			setShowDatePicker(false);
		}
		if (date) {
			setSelectedDate(date);
			const formattedDate = date.toISOString().split("T")[0];
			setTaskDueDate(formattedDate);
		}
	};

	const formatDisplayDate = (dateString: string) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleDateString("vi-VN", {
			weekday: "short",
			day: "numeric",
			month: "numeric",
		});
	};

	const resetForms = () => {
		setCustomerName("");
		setCustomerPhone("");
		setCustomerEmail("");
		setCustomerSource("");
		setCustomerSourceNote("");
		setCustomerNote("");
		setTaskTitle("");
		setTaskType("call");
		setTaskDueDate("");
		setTaskNote("");
		setSelectedLeadId(null);
		setNoteContent("");
		setNoteType("call");
		setNoteLeadId(null);
		setLeadSearchQuery("");
	};

	const handleOpenAction = (action: QuickActionType) => {
		setActiveAction(action);
		// Set default due date to tomorrow for task
		if (action === "task") {
			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
			setSelectedDate(tomorrow);
			setTaskDueDate(tomorrow.toISOString().split("T")[0]);
		}
		openSheet();
	};

	const handleCloseAction = () => {
		closeSheet(() => {
			setActiveAction(null);
			resetForms();
		});
	};

	// Create Customer
	const handleCreateCustomer = async () => {
		if (!customerName.trim()) {
			Alert.alert(t("common.error"), t("quickAction.enterCustomerName"));
			return;
		}
		if (!customerPhone.trim() && !customerEmail.trim()) {
			Alert.alert(t("common.error"), t("quickAction.enterPhoneOrEmail"));
			return;
		}

		setLoading(true);
		try {
			await api.createLead({
				full_name: customerName,
				phone_number: customerPhone || undefined,
				email: customerEmail || undefined,
				source: customerSource || undefined,
				source_detail: customerSource === "other" ? customerSourceNote : undefined,
				note: customerNote || undefined,
				status: "LEAD",
			});
			Alert.alert(t("common.success"), t("quickAction.customerAdded"));
			handleCloseAction();
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("quickAction.cannotAddCustomer"));
		} finally {
			setLoading(false);
		}
	};

	// Create Task
	const handleCreateTask = async () => {
		if (!taskTitle.trim()) {
			Alert.alert(t("common.error"), t("tasks.enterTaskTitle"));
			return;
		}
		if (!selectedLeadId) {
			Alert.alert(t("common.error"), t("quickAction.selectCustomerRequired"));
			return;
		}

		const dueDate = taskDueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

		setLoading(true);
		try {
			await api.createTask({
				title: taskTitle,
				description: taskNote || undefined,
				due_date: dueDate,
				lead_id: selectedLeadId,
				type: taskType,
			});
			Alert.alert(t("common.success"), t("tasks.taskCreated"));
			handleCloseAction();
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("tasks.cannotCreateTask"));
		} finally {
			setLoading(false);
		}
	};

	// Create Note
	const handleCreateNote = async () => {
		if (!noteContent.trim()) {
			Alert.alert(t("common.error"), t("quickAction.enterNoteContent"));
			return;
		}
		if (!noteLeadId) {
			Alert.alert(t("common.error"), t("quickAction.selectCustomerRequired"));
			return;
		}

		setLoading(true);
		try {
			await api.createNote({
				lead_id: noteLeadId,
				title: NOTE_TYPES.find((t) => t.value === noteType)?.label || "Ghi chú",
				content: noteContent,
				type: "normal",
			});
			// Also create an activity log
			await api.createActivity({
				lead_id: noteLeadId,
				type: noteType === "call" ? "CALL" : noteType === "meeting" ? "MEETING" : noteType === "email" ? "EMAIL" : "NOTE",
				content: noteContent,
				happened_at: new Date().toISOString(),
			});
			Alert.alert(t("common.success"), t("notes.noteAdded"));
			handleCloseAction();
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("notes.cannotAddNote"));
		} finally {
			setLoading(false);
		}
	};

	const getSelectedLeadName = (leadId: number | null) => {
		if (!leadId) return "";
		const lead = leads.find((l) => l.id === leadId);
		return lead?.full_name || "";
	};

	const actions = [
		{
			id: "task",
			icon: "checkbox-outline",
			label: t("quickAction.createTask"),
			color: colors.success,
		},
		{
			id: "note",
			icon: "document-text-outline",
			label: t("quickAction.addNote"),
			color: colors.info,
		},
		{
			id: "customer",
			icon: "person-add-outline",
			label: t("quickAction.addCustomer"),
			color: colors.primary,
		},
	];

	// If not sales, show empty message
	if (!isSales) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<View style={styles.emptyContainer}>
					<Ionicons name="lock-closed" size={64} color={colors.textLight} />
					<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("quickAction.salesOnly")}</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Lead picker component
	const renderLeadPicker = (visible: boolean, onClose: () => void, selectedId: number | null, onSelect: (id: number) => void) => (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
			<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
				<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={24} color={colors.text} />
					</TouchableOpacity>
					<Text style={[styles.modalTitle, { color: colors.text }]}>{t("tasks.selectCustomer")}</Text>
					<View style={{ width: 24 }} />
				</View>

				<View style={styles.searchContainer}>
					<View style={[styles.searchInputContainer, { backgroundColor: colors.inputBackground }]}>
						<Ionicons name="search" size={20} color={colors.textLight} />
						<TextInput style={[styles.searchInput, { color: colors.text }]} placeholder={t("customers.searchPlaceholder")} placeholderTextColor={colors.placeholder} value={leadSearchQuery} onChangeText={setLeadSearchQuery} />
						{leadSearchQuery ? (
							<TouchableOpacity onPress={() => setLeadSearchQuery("")}>
								<Ionicons name="close-circle" size={20} color={colors.textLight} />
							</TouchableOpacity>
						) : null}
					</View>
				</View>

				<FlatList
					data={leads.filter((lead) => !leadSearchQuery || lead.full_name.toLowerCase().includes(leadSearchQuery.toLowerCase()) || (lead.phone_number && lead.phone_number.includes(leadSearchQuery)))}
					keyExtractor={(item) => item.id.toString()}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={[
								styles.leadOption,
								{
									backgroundColor: selectedId === item.id ? colors.primary + "15" : colors.card,
									borderColor: selectedId === item.id ? colors.primary : colors.border,
								},
							]}
							onPress={() => {
								onSelect(item.id);
								onClose();
							}}>
							<View style={[styles.leadAvatar, { backgroundColor: colors.primary + "20" }]}>
								<Text style={[styles.leadAvatarText, { color: colors.primary }]}>{item.full_name.charAt(0).toUpperCase()}</Text>
							</View>
							<View style={styles.leadInfo}>
								<Text style={[styles.leadName, { color: colors.text }]}>{item.full_name}</Text>
								{item.phone_number && <Text style={[styles.leadPhone, { color: colors.textSecondary }]}>{item.phone_number}</Text>}
							</View>
							{selectedId === item.id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
						</TouchableOpacity>
					)}
					contentContainerStyle={styles.leadListContent}
					ListEmptyComponent={
						<View style={styles.emptyLeadList}>
							<Text style={[styles.emptyLeadText, { color: colors.textLight }]}>{t("customers.noCustomers")}</Text>
						</View>
					}
				/>
			</SafeAreaView>
		</Modal>
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>{t("quickAction.title")}</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("quickAction.subtitle")}</Text>
			</View>

			{/* Action buttons */}
			<View style={styles.actionsContainer}>
				{actions.map((action) => (
					<TouchableOpacity key={action.id} style={[styles.actionCard, { backgroundColor: action.color + "10", borderColor: action.color + "30" }]} onPress={() => handleOpenAction(action.id as QuickActionType)} activeOpacity={0.7}>
						<View style={[styles.actionIcon, { backgroundColor: action.color }]}>
							<Ionicons name={action.icon as any} size={28} color={colors.white} />
						</View>
						<Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
						<Ionicons name="chevron-forward" size={20} color={colors.textLight} />
					</TouchableOpacity>
				))}
			</View>

			{/* Bottom Sheet Modals */}
			{/* Customer Form */}
			<Modal visible={activeAction === "customer"} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseAction}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={handleCloseAction}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("quickAction.addCustomer")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Customer Name */}
							<TextInput label={t("customers.customerName") + " *"} placeholder={t("customers.customerNamePlaceholder")} value={customerName} onChangeText={setCustomerName} />

							{/* Phone */}
							<TextInput label={t("customers.phone") + " *"} placeholder={t("customers.phonePlaceholder")} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />

							{/* Email */}
							<TextInput label="Email" placeholder={t("customers.emailPlaceholder")} value={customerEmail} onChangeText={setCustomerEmail} keyboardType="email-address" autoCapitalize="none" />

							{/* Source */}
							<View style={styles.fieldContainer}>
								<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("customers.source")}</Text>
								<TouchableOpacity style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowSourcePicker(true)}>
									<Text style={[styles.pickerText, { color: customerSource ? colors.text : colors.placeholder }]}>{customerSource ? LEAD_SOURCES.find((s) => s.value === customerSource)?.label : t("quickAction.selectSource")}</Text>
									<Ionicons name="chevron-down" size={20} color={colors.textLight} />
								</TouchableOpacity>
							</View>

							{/* Source Note (if Other selected) */}
							{customerSource === "other" && <TextInput label={t("quickAction.sourceNote")} placeholder={t("quickAction.sourceNotePlaceholder")} value={customerSourceNote} onChangeText={setCustomerSourceNote} />}

							{/* Initial Note */}
							<TextInput label={t("quickAction.initialNote")} placeholder={t("quickAction.initialNotePlaceholder")} value={customerNote} onChangeText={setCustomerNote} multiline numberOfLines={2} />

							<Button title={loading ? t("common.loading") : t("common.save")} onPress={handleCreateCustomer} disabled={loading} style={styles.submitButton} />
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</Modal>

			{/* Task Form */}
			<Modal visible={activeAction === "task"} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseAction}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={handleCloseAction}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("quickAction.createTask")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Task Title */}
							<TextInput label={t("tasks.taskTitle") + " *"} placeholder={t("quickAction.taskTitlePlaceholder")} value={taskTitle} onChangeText={setTaskTitle} />

							{/* Task Type */}
							<View style={styles.fieldContainer}>
								<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("quickAction.taskType")}</Text>
								<TouchableOpacity style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowTaskTypePicker(true)}>
									<Ionicons name={TASK_TYPES.find((t) => t.value === taskType)?.icon as any} size={20} color={colors.primary} />
									<Text style={[styles.pickerText, { color: colors.text, marginLeft: Spacing.sm }]}>{TASK_TYPES.find((t) => t.value === taskType)?.label}</Text>
									<Ionicons name="chevron-down" size={20} color={colors.textLight} />
								</TouchableOpacity>
							</View>

							{/* Customer */}
							<View style={styles.fieldContainer}>
								<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("tasks.relatedCustomer")} *</Text>
								<TouchableOpacity style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowLeadPicker(true)}>
									<Ionicons name="person-outline" size={20} color={colors.primary} />
									<Text style={[styles.pickerText, { color: selectedLeadId ? colors.text : colors.placeholder, marginLeft: Spacing.sm, flex: 1 }]}>{selectedLeadId ? getSelectedLeadName(selectedLeadId) : t("tasks.selectCustomer")}</Text>
									{selectedLeadId && (
										<TouchableOpacity onPress={() => setSelectedLeadId(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
											<Ionicons name="close-circle" size={20} color={colors.textLight} />
										</TouchableOpacity>
									)}
								</TouchableOpacity>
							</View>

							{/* Due Date */}
							<View style={styles.fieldContainer}>
								<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("tasks.dueDate")} *</Text>
								<TouchableOpacity style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
									<Ionicons name="calendar-outline" size={20} color={colors.primary} />
									<Text style={[styles.pickerText, { color: taskDueDate ? colors.text : colors.placeholder, marginLeft: Spacing.sm }]}>{taskDueDate ? formatDisplayDate(taskDueDate) : t("tasks.selectDueDate")}</Text>
								</TouchableOpacity>
								{/* Quick date options */}
								<View style={styles.quickDateRow}>
									<TouchableOpacity
										style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
										onPress={() => {
											const today = new Date();
											setSelectedDate(today);
											setTaskDueDate(today.toISOString().split("T")[0]);
										}}>
										<Text style={[styles.quickDateText, { color: colors.text }]}>{t("common.today")}</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
										onPress={() => {
											const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
											setSelectedDate(tomorrow);
											setTaskDueDate(tomorrow.toISOString().split("T")[0]);
										}}>
										<Text style={[styles.quickDateText, { color: colors.text }]}>{t("common.tomorrow")}</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.quickDateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
										onPress={() => {
											const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
											setSelectedDate(in3Days);
											setTaskDueDate(in3Days.toISOString().split("T")[0]);
										}}>
										<Text style={[styles.quickDateText, { color: colors.text }]}>{t("tasks.in3Days")}</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Note */}
							<TextInput label={t("quickAction.taskNote")} placeholder={t("quickAction.taskNotePlaceholder")} value={taskNote} onChangeText={setTaskNote} multiline numberOfLines={2} />

							<Button title={loading ? t("common.loading") : t("common.save")} onPress={handleCreateTask} disabled={loading} style={styles.submitButton} />
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</Modal>

			{/* Note Form */}
			<Modal visible={activeAction === "note"} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseAction}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={handleCloseAction}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("quickAction.addNote")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
						<ScrollView showsVerticalScrollIndicator={false}>
							{/* Customer */}
							<View style={styles.fieldContainer}>
								<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("tasks.relatedCustomer")} *</Text>
								<TouchableOpacity style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowNoteLeadPicker(true)}>
									<Ionicons name="person-outline" size={20} color={colors.primary} />
									<Text style={[styles.pickerText, { color: noteLeadId ? colors.text : colors.placeholder, marginLeft: Spacing.sm, flex: 1 }]}>{noteLeadId ? getSelectedLeadName(noteLeadId) : t("tasks.selectCustomer")}</Text>
									{noteLeadId && (
										<TouchableOpacity onPress={() => setNoteLeadId(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
											<Ionicons name="close-circle" size={20} color={colors.textLight} />
										</TouchableOpacity>
									)}
								</TouchableOpacity>
							</View>

							{/* Note Content */}
							<TextInput label={t("quickAction.noteContent") + " *"} placeholder={t("quickAction.noteContentPlaceholder")} value={noteContent} onChangeText={setNoteContent} multiline numberOfLines={4} />

							{/* Note Type */}
							<View style={styles.fieldContainer}>
								<Text style={[styles.fieldLabel, { color: colors.text }]}>{t("quickAction.noteType")}</Text>
								<View style={styles.noteTypeRow}>
									{NOTE_TYPES.map((type) => (
										<TouchableOpacity
											key={type.value}
											style={[
												styles.noteTypeChip,
												{
													backgroundColor: noteType === type.value ? colors.primary : colors.surface,
													borderColor: noteType === type.value ? colors.primary : colors.border,
												},
											]}
											onPress={() => setNoteType(type.value)}>
											<Ionicons name={type.icon as any} size={16} color={noteType === type.value ? colors.white : colors.text} />
											<Text style={[styles.noteTypeText, { color: noteType === type.value ? colors.white : colors.text }]}>{type.label}</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							<Button title={loading ? t("common.loading") : t("common.save")} onPress={handleCreateNote} disabled={loading} style={styles.submitButton} />
						</ScrollView>
					</KeyboardAvoidingView>
				</SafeAreaView>
			</Modal>

			{/* Source Picker Modal */}
			<Modal visible={showSourcePicker} animationType="fade" transparent onRequestClose={() => setShowSourcePicker(false)}>
				<TouchableOpacity style={styles.pickerOverlay} onPress={() => setShowSourcePicker(false)} activeOpacity={1}>
					<View style={[styles.pickerSheet, { backgroundColor: colors.background }]}>
						<View style={[styles.pickerSheetHeader, { borderBottomColor: colors.border }]}>
							<Text style={[styles.pickerSheetTitle, { color: colors.text }]}>{t("customers.source")}</Text>
						</View>
						{LEAD_SOURCES.map((source) => (
							<TouchableOpacity
								key={source.value}
								style={[
									styles.pickerOption,
									{
										backgroundColor: customerSource === source.value ? colors.primary + "15" : "transparent",
									},
								]}
								onPress={() => {
									setCustomerSource(source.value);
									setShowSourcePicker(false);
								}}>
								<Text style={[styles.pickerOptionText, { color: colors.text }]}>{source.label}</Text>
								{customerSource === source.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
							</TouchableOpacity>
						))}
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Task Type Picker Modal */}
			<Modal visible={showTaskTypePicker} animationType="fade" transparent onRequestClose={() => setShowTaskTypePicker(false)}>
				<TouchableOpacity style={styles.pickerOverlay} onPress={() => setShowTaskTypePicker(false)} activeOpacity={1}>
					<View style={[styles.pickerSheet, { backgroundColor: colors.background }]}>
						<View style={[styles.pickerSheetHeader, { borderBottomColor: colors.border }]}>
							<Text style={[styles.pickerSheetTitle, { color: colors.text }]}>{t("quickAction.taskType")}</Text>
						</View>
						{TASK_TYPES.map((type) => (
							<TouchableOpacity
								key={type.value}
								style={[
									styles.pickerOption,
									{
										backgroundColor: taskType === type.value ? colors.primary + "15" : "transparent",
									},
								]}
								onPress={() => {
									setTaskType(type.value);
									setShowTaskTypePicker(false);
								}}>
								<Ionicons name={type.icon as any} size={20} color={colors.text} style={{ marginRight: Spacing.sm }} />
								<Text style={[styles.pickerOptionText, { color: colors.text, flex: 1 }]}>{type.label}</Text>
								{taskType === type.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
							</TouchableOpacity>
						))}
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Date Picker */}
			{Platform.OS === "ios" && showDatePicker && (
				<Modal transparent animationType="slide" visible={showDatePicker}>
					<View style={styles.datePickerModal}>
						<View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
							<View style={styles.datePickerHeader}>
								<TouchableOpacity onPress={() => setShowDatePicker(false)}>
									<Text style={[styles.datePickerButton, { color: colors.error }]}>{t("common.cancel")}</Text>
								</TouchableOpacity>
								<TouchableOpacity onPress={() => setShowDatePicker(false)}>
									<Text style={[styles.datePickerButton, { color: colors.primary }]}>{t("common.done")}</Text>
								</TouchableOpacity>
							</View>
							<DateTimePicker value={selectedDate} mode="date" display="spinner" onChange={handleDateChange} minimumDate={new Date()} locale="vi-VN" />
						</View>
					</View>
				</Modal>
			)}
			{Platform.OS === "android" && showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />}

			{/* Lead Pickers */}
			{renderLeadPicker(showLeadPicker, () => setShowLeadPicker(false), selectedLeadId, setSelectedLeadId)}
			{renderLeadPicker(showNoteLeadPicker, () => setShowNoteLeadPicker(false), noteLeadId, setNoteLeadId)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.lg,
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
	},
	subtitle: {
		fontSize: FontSize.sm,
		marginTop: Spacing.xs,
	},
	actionsContainer: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.md,
	},
	actionCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		marginBottom: Spacing.md,
		borderWidth: 1,
	},
	actionIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	actionLabel: {
		flex: 1,
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
	},
	emptyText: {
		fontSize: FontSize.md,
		marginTop: Spacing.md,
		textAlign: "center",
	},
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
	submitButton: {
		marginTop: Spacing.lg,
		marginBottom: Spacing.xxl,
	},
	fieldContainer: {
		marginBottom: Spacing.md,
	},
	fieldLabel: {
		fontSize: FontSize.sm,
		fontWeight: "500",
		marginBottom: Spacing.xs,
	},
	pickerButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		minHeight: 48,
	},
	pickerText: {
		fontSize: FontSize.md,
		flex: 1,
	},
	quickDateRow: {
		flexDirection: "row",
		marginTop: Spacing.sm,
		gap: Spacing.sm,
	},
	quickDateChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
	},
	quickDateText: {
		fontSize: FontSize.xs,
	},
	noteTypeRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	noteTypeChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
		gap: Spacing.xs,
	},
	noteTypeText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	// Picker overlay
	pickerOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.lg,
	},
	pickerSheet: {
		width: "100%",
		maxWidth: 320,
		borderRadius: BorderRadius.lg,
		overflow: "hidden",
	},
	pickerSheetHeader: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	pickerSheetTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	pickerOption: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	pickerOptionText: {
		fontSize: FontSize.md,
		flex: 1,
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
	},
	searchInput: {
		flex: 1,
		fontSize: FontSize.base,
		paddingVertical: Spacing.sm,
		marginLeft: Spacing.sm,
	},
	// Lead list
	leadListContent: {
		paddingHorizontal: Spacing.lg,
	},
	leadOption: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
	leadAvatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	leadAvatarText: {
		fontSize: FontSize.lg,
		fontWeight: "600",
	},
	leadInfo: {
		flex: 1,
	},
	leadName: {
		fontSize: FontSize.base,
		fontWeight: "500",
	},
	leadPhone: {
		fontSize: FontSize.sm,
		marginTop: 2,
	},
	emptyLeadList: {
		padding: Spacing.xl,
		alignItems: "center",
	},
	emptyLeadText: {
		fontSize: FontSize.base,
	},
	// Date picker
	datePickerModal: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0, 0, 0, 0.5)",
	},
	datePickerContainer: {
		borderTopLeftRadius: BorderRadius.lg,
		borderTopRightRadius: BorderRadius.lg,
		paddingBottom: Spacing.xl,
	},
	datePickerHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
	},
	datePickerButton: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
});
