import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Linking, Alert, Modal, ScrollView, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Lead, LeadStatus, LeadPriority, User } from "@/types";
import { Loading, EmptyState, Button } from "@/components/ui";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// 1. Lead mới (xám) → 2. Đã liên hệ (xanh nhạt) → 3. Quan tâm (xanh) → 4. Có nhu cầu (cam) → 5. Đã mua (xanh đậm) → 6. Không nhu cầu (đỏ)
const STATUS_CONFIG: Record<LeadStatus, { color: string; bgColor: string }> = {
	LEAD_NEW: { color: "#6B7280", bgColor: "#6B728015" }, // Xám - Lead mới (chưa có tương tác)
	CONTACTED: { color: "#60A5FA", bgColor: "#60A5FA15" }, // Xanh nhạt - Đã liên hệ (có phản hồi, chưa rõ nhu cầu)
	INTERESTED: { color: "#3B82F6", bgColor: "#3B82F615" }, // Xanh - Quan tâm/Đang chăm sóc (trả lời đều, cần follow-up)
	QUALIFIED: { color: "#F59E0B", bgColor: "#F59E0B15" }, // Cam - Có nhu cầu (yêu cầu báo giá, hẹn demo)
	WON: { color: "#1E40AF", bgColor: "#1E40AF15" }, // Xanh đậm - Đã mua (deal chốt)
	LOST: { color: "#EF4444", bgColor: "#EF444415" }, // Đỏ - Không có nhu cầu (từ chối)
};

// Priority
const PRIORITY_CONFIG: Record<LeadPriority, { color: string; bgColor: string }> = {
	HIGH: { color: "#EF4444", bgColor: "#EF444415" },
	MEDIUM: { color: "#F59E0B", bgColor: "#F59E0B15" },
	LOW: { color: "#6B7280", bgColor: "#6B728015" },
};

export default function CustomersScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { isManager, user, isAuthenticated } = useAuth();
	const { t } = useTranslation();

	const [leads, setLeads] = useState<Lead[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Search state
	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<TextInput>(null);

	// Filter states
	const [showFilterSheet, setShowFilterSheet] = useState(false);
	const [filterSalesId, setFilterSalesId] = useState<number | null>(null);
	const [filterStatuses, setFilterStatuses] = useState<LeadStatus[]>([]);
	const [filterPriorities, setFilterPriorities] = useState<LeadPriority[]>([]);
	const [filterFollowUp, setFilterFollowUp] = useState<{
		notFollowed: boolean;
		overdue: boolean;
		taskToday: boolean;
	}>({ notFollowed: false, overdue: false, taskToday: false });
	const [filterTimeRange, setFilterTimeRange] = useState<"7days" | "30days" | "new" | null>(null);

	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const filterSheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

	// Quick note modal state
	const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
	const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
	const [quickNote, setQuickNote] = useState("");
	const [savingNote, setSavingNote] = useState(false);

	// Swipe action state
	const swipeAnimations = useRef<{ [key: number]: Animated.Value }>({}).current;

	const fetchTeamMembers = async () => {
		if (!isManager) return;
		try {
			const response = await api.getTeamMembers();
			setTeamMembers((response as any).data || []);
		} catch (error) {
			console.error("Error fetching team members:", error);
		}
	};

	useEffect(() => {
		fetchTeamMembers();
	}, [isManager]);

	const fetchLeads = async (isRefresh = false) => {
		if (!isAuthenticated) return;
		try {
			if (!isRefresh) setLoading(true);
			const params: any = {};

			if (searchQuery) params.search = searchQuery;
			if (filterSalesId) params.owner_id = filterSalesId;
			if (filterStatuses.length > 0) params.status = filterStatuses.join(",");
			if (filterPriorities.length > 0) params.priority = filterPriorities.join(",");
			if (filterFollowUp.notFollowed) params.not_followed = true;
			if (filterFollowUp.overdue) params.follow_up_due = true;
			if (filterFollowUp.taskToday) params.task_today = true;
			if (filterTimeRange === "7days") params.updated_days = 7;
			if (filterTimeRange === "30days") params.updated_days = 30;
			if (filterTimeRange === "new") params.new_leads = true;

			const response = await api.getLeads(params);
			setLeads((response as any).data || []);
		} catch (error) {
			console.error("Error fetching leads:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (!isAuthenticated) return;
			fetchLeads();
		}, [searchQuery, filterSalesId, filterStatuses, filterPriorities, filterFollowUp, filterTimeRange, isAuthenticated]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchLeads(true);
	};

	// Filter sheet
	const openFilterSheet = () => {
		setShowFilterSheet(true);
		Animated.spring(filterSheetAnim, {
			toValue: 0,
			useNativeDriver: true,
			tension: 65,
			friction: 11,
		}).start();
	};

	const closeFilterSheet = () => {
		Animated.timing(filterSheetAnim, {
			toValue: SCREEN_HEIGHT,
			duration: 250,
			useNativeDriver: true,
		}).start(() => setShowFilterSheet(false));
	};

	// Quick actions
	const handleCall = async (lead: Lead) => {
		if (!lead.phone_number) {
			Alert.alert(t("common.error"), t("customers.noPhone"));
			return;
		}

		try {
			await api.createActivity({
				lead_id: lead.id,
				type: "CALL",
				content: `${t("activities.callWith")} ${lead.full_name}`,
				happened_at: new Date().toISOString(),
			});
		} catch (error) {
			console.error("Error logging call activity:", error);
		}

		Linking.openURL(`tel:${lead.phone_number}`);
	};

	const handleOpenQuickNote = (lead: Lead) => {
		setSelectedLead(lead);
		setQuickNote("");
		setShowQuickNoteModal(true);
	};

	const handleSaveQuickNote = async () => {
		if (!quickNote.trim() || !selectedLead) return;

		setSavingNote(true);
		try {
			await api.createNote({
				lead_id: selectedLead.id,
				title: t("customers.quickNote"),
				content: quickNote,
				type: isManager ? "manager" : "normal",
			});
			setShowQuickNoteModal(false);
			setQuickNote("");
			setSelectedLead(null);
			Alert.alert(t("common.success"), t("notes.noteAdded"));
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("notes.cannotAddNote"));
		} finally {
			setSavingNote(false);
		}
	};

	const formatTimeAgo = (dateString?: string) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 60) return t("common.minutesAgo", { count: diffInMinutes });
		if (diffInMinutes < 1440) return t("common.hoursAgo", { count: Math.floor(diffInMinutes / 60) });
		return t("common.daysAgo", { count: Math.floor(diffInMinutes / 1440) });
	};

	const getStatusLabel = (status: LeadStatus) => {
		switch (status) {
			case "LEAD_NEW":
				return t("customers.statusLeadNew");
			case "CONTACTED":
				return t("customers.statusContacted");
			case "INTERESTED":
				return t("customers.statusInterested");
			case "QUALIFIED":
				return t("customers.statusQualified");
			case "WON":
				return t("customers.statusWon");
			case "LOST":
				return t("customers.statusLost");
			default:
				return status;
		}
	};

	const getPriorityLabel = (priority?: LeadPriority) => {
		if (!priority) return "";
		switch (priority) {
			case "HIGH":
				return t("customers.priorityHigh");
			case "MEDIUM":
				return t("customers.priorityMedium");
			case "LOW":
				return t("customers.priorityLow");
			default:
				return priority;
		}
	};

	const getActiveFilterCount = () => {
		let count = 0;
		if (filterSalesId) count++;
		if (filterStatuses.length > 0) count++;
		if (filterPriorities.length > 0) count++;
		if (filterFollowUp.notFollowed || filterFollowUp.overdue || filterFollowUp.taskToday) count++;
		if (filterTimeRange) count++;
		return count;
	};

	const clearAllFilters = () => {
		setFilterSalesId(null);
		setFilterStatuses([]);
		setFilterPriorities([]);
		setFilterFollowUp({ notFollowed: false, overdue: false, taskToday: false });
		setFilterTimeRange(null);
	};

	const toggleStatus = (status: LeadStatus) => {
		setFilterStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
	};

	const togglePriority = (priority: LeadPriority) => {
		setFilterPriorities((prev) => (prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]));
	};

	// Customer card component
	const renderLeadItem = ({ item }: { item: Lead }) => {
		const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.LEAD_NEW;
		const priorityConfig = item.priority ? PRIORITY_CONFIG[item.priority] : null;
		const isOverdue = item.follow_up_due || (item.days_since_contact != null && item.days_since_contact > 7);

		return (
			<TouchableOpacity style={[styles.leadCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/lead/${item.id}`)} activeOpacity={0.7}>
				<View style={styles.leadMainContent}>
					{/* Row 1: Name + Priority */}
					<View style={styles.leadRow1}>
						<Text style={[styles.leadName, { color: colors.text }]} numberOfLines={1}>
							{item.full_name}
						</Text>
						{priorityConfig && (
							<View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bgColor }]}>
								<Text style={[styles.priorityText, { color: priorityConfig.color }]}>{getPriorityLabel(item.priority)}</Text>
							</View>
						)}
					</View>

					{/* Row 2: Status + Time */}
					<View style={styles.leadRow2}>
						<View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
							<Text style={[styles.statusText, { color: statusConfig.color }]}>{getStatusLabel(item.status)}</Text>
						</View>
						<Text style={[styles.leadTime, { color: colors.textLight }]}>• {formatTimeAgo(item.updated_at || item.last_contact_at)}</Text>
					</View>

					{/* Manager only: Sales name */}
					{isManager && item.owner && <Text style={[styles.ownerName, { color: colors.textSecondary }]}>{item.owner.name}</Text>}

					{/* Warning badge for overdue follow-up */}
					{isOverdue && (
						<View style={[styles.warningBadge, { backgroundColor: colors.warning + "20" }]}>
							<Ionicons name="warning" size={12} color={colors.warning} />
							<Text style={[styles.warningText, { color: colors.warning }]}>{item.follow_up_due ? t("customers.followUpDue") : t("customers.notFollowedUp", { days: item.days_since_contact ?? 0 })}</Text>
						</View>
					)}
				</View>

				{/* Quick action: Call */}
				<TouchableOpacity style={[styles.callButton, { backgroundColor: colors.success + "15" }]} onPress={() => handleCall(item)}>
					<Ionicons name="call" size={20} color={colors.success} />
				</TouchableOpacity>
			</TouchableOpacity>
		);
	};

	// Filter bottom sheet
	const renderFilterSheet = () => (
		<Modal visible={showFilterSheet} transparent animationType="none" onRequestClose={closeFilterSheet}>
			<View style={styles.filterOverlay}>
				<TouchableOpacity style={styles.filterOverlayBg} onPress={closeFilterSheet} />
				<Animated.View style={[styles.filterSheet, { backgroundColor: colors.background, transform: [{ translateY: filterSheetAnim }] }]}>
					{/* Header */}
					<View style={[styles.filterHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={clearAllFilters}>
							<Text style={[styles.filterClearText, { color: colors.error }]}>{t("customers.clearFilters")}</Text>
						</TouchableOpacity>
						<Text style={[styles.filterTitle, { color: colors.text }]}>{t("customers.filters")}</Text>
						<TouchableOpacity onPress={closeFilterSheet}>
							<Text style={[styles.filterApplyText, { color: colors.primary }]}>{t("customers.apply")}</Text>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
						{/* Group 1: Sales (Manager only) */}
						{isManager && (
							<View style={styles.filterGroup}>
								<Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>{t("customers.filterBySales")}</Text>
								<View style={styles.filterChipsWrap}>
									<TouchableOpacity
										style={[
											styles.filterChip,
											{
												backgroundColor: filterSalesId === null ? colors.primary : colors.surface,
												borderColor: filterSalesId === null ? colors.primary : colors.border,
											},
										]}
										onPress={() => setFilterSalesId(null)}>
										<Text style={[styles.filterChipText, { color: filterSalesId === null ? colors.white : colors.text }]}>{t("customers.allSales")}</Text>
									</TouchableOpacity>
									{teamMembers.map((member) => (
										<TouchableOpacity
											key={member.id}
											style={[
												styles.filterChip,
												{
													backgroundColor: filterSalesId === member.id ? colors.primary : colors.surface,
													borderColor: filterSalesId === member.id ? colors.primary : colors.border,
												},
											]}
											onPress={() => setFilterSalesId(member.id)}>
											<Text style={[styles.filterChipText, { color: filterSalesId === member.id ? colors.white : colors.text }]}>{member.name}</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
						)}

						{/* Group 2: Status */}
						<View style={styles.filterGroup}>
							<Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>{t("customers.status")}</Text>
							<View style={styles.filterChipsWrap}>
								{(["LEAD_NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "WON", "LOST"] as LeadStatus[]).map((status) => {
									const config = STATUS_CONFIG[status];
									const isSelected = filterStatuses.includes(status);
									return (
										<TouchableOpacity
											key={status}
											style={[
												styles.filterChip,
												{
													backgroundColor: isSelected ? config.color : colors.surface,
													borderColor: isSelected ? config.color : colors.border,
												},
											]}
											onPress={() => toggleStatus(status)}>
											<Text style={[styles.filterChipText, { color: isSelected ? colors.white : colors.text }]}>{getStatusLabel(status)}</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Group 3: Follow-up */}
						<View style={styles.filterGroup}>
							<Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>{t("customers.followUpFilter")}</Text>
							<View style={styles.filterCheckboxes}>
								<TouchableOpacity style={styles.filterCheckbox} onPress={() => setFilterFollowUp((prev) => ({ ...prev, notFollowed: !prev.notFollowed }))}>
									<Ionicons name={filterFollowUp.notFollowed ? "checkbox" : "square-outline"} size={22} color={filterFollowUp.notFollowed ? colors.primary : colors.textLight} />
									<Text style={[styles.filterCheckboxText, { color: colors.text }]}>{t("customers.filterNotFollowed")}</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.filterCheckbox} onPress={() => setFilterFollowUp((prev) => ({ ...prev, overdue: !prev.overdue }))}>
									<Ionicons name={filterFollowUp.overdue ? "checkbox" : "square-outline"} size={22} color={filterFollowUp.overdue ? colors.primary : colors.textLight} />
									<Text style={[styles.filterCheckboxText, { color: colors.text }]}>{t("customers.filterOverdue")}</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.filterCheckbox} onPress={() => setFilterFollowUp((prev) => ({ ...prev, taskToday: !prev.taskToday }))}>
									<Ionicons name={filterFollowUp.taskToday ? "checkbox" : "square-outline"} size={22} color={filterFollowUp.taskToday ? colors.primary : colors.textLight} />
									<Text style={[styles.filterCheckboxText, { color: colors.text }]}>{t("customers.filterTaskToday")}</Text>
								</TouchableOpacity>
							</View>
						</View>

						{/* Group 4: Priority */}
						<View style={styles.filterGroup}>
							<Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>{t("customers.priority")}</Text>
							<View style={styles.filterChipsWrap}>
								{(["HIGH", "MEDIUM", "LOW"] as LeadPriority[]).map((priority) => {
									const config = PRIORITY_CONFIG[priority];
									const isSelected = filterPriorities.includes(priority);
									return (
										<TouchableOpacity
											key={priority}
											style={[
												styles.filterChip,
												{
													backgroundColor: isSelected ? config.color : colors.surface,
													borderColor: isSelected ? config.color : colors.border,
												},
											]}
											onPress={() => togglePriority(priority)}>
											<Text style={[styles.filterChipText, { color: isSelected ? colors.white : colors.text }]}>{getPriorityLabel(priority)}</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>

						{/* Group 5: Time */}
						<View style={[styles.filterGroup, { marginBottom: Spacing.xxl }]}>
							<Text style={[styles.filterGroupTitle, { color: colors.textSecondary }]}>{t("customers.filterByTime")}</Text>
							<View style={styles.filterChipsWrap}>
								{[
									{ value: "7days" as const, label: t("customers.filter7Days") },
									{ value: "30days" as const, label: t("customers.filter30Days") },
									{ value: "new" as const, label: t("customers.filterNewCustomers") },
								].map((option) => (
									<TouchableOpacity
										key={option.value}
										style={[
											styles.filterChip,
											{
												backgroundColor: filterTimeRange === option.value ? colors.primary : colors.surface,
												borderColor: filterTimeRange === option.value ? colors.primary : colors.border,
											},
										]}
										onPress={() => setFilterTimeRange((prev) => (prev === option.value ? null : option.value))}>
										<Text
											style={[
												styles.filterChipText,
												{
													color: filterTimeRange === option.value ? colors.white : colors.text,
												},
											]}>
											{option.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>
					</ScrollView>
				</Animated.View>
			</View>
		</Modal>
	);

	const activeFilterCount = getActiveFilterCount();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>{t("customers.title")}</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={[styles.headerButton, { backgroundColor: colors.surface }]}
						onPress={() => {
							setShowSearch(!showSearch);
							if (!showSearch) {
								setTimeout(() => searchInputRef.current?.focus(), 100);
							}
						}}>
						<Ionicons name="search" size={20} color={colors.text} />
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.headerButton,
							{
								backgroundColor: activeFilterCount > 0 ? colors.primary + "15" : colors.surface,
								marginLeft: Spacing.sm,
							},
						]}
						onPress={openFilterSheet}>
						<Ionicons name="options" size={20} color={activeFilterCount > 0 ? colors.primary : colors.text} />
						{activeFilterCount > 0 && (
							<View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
								<Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
							</View>
						)}
					</TouchableOpacity>
				</View>
			</View>

			{/* Search bar */}
			{showSearch && (
				<View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
					<Ionicons name="search" size={20} color={colors.textLight} />
					<TextInput ref={searchInputRef} style={[styles.searchInput, { color: colors.text }]} placeholder={t("customers.searchPlaceholder")} placeholderTextColor={colors.placeholder} value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" />
					{searchQuery ? (
						<TouchableOpacity onPress={() => setSearchQuery("")}>
							<Ionicons name="close-circle" size={20} color={colors.textLight} />
						</TouchableOpacity>
					) : null}
				</View>
			)}

			{/* Active filters indicator */}
			{activeFilterCount > 0 && (
				<View style={[styles.activeFiltersBar, { backgroundColor: colors.primary + "10" }]}>
					<Text style={[styles.activeFiltersText, { color: colors.primary }]}>{t("customers.activeFilters", { count: activeFilterCount })}</Text>
					<TouchableOpacity onPress={clearAllFilters}>
						<Text style={[styles.clearFiltersLink, { color: colors.primary }]}>{t("customers.clearAll")}</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Lead list */}
			{loading ? (
				<Loading />
			) : leads.length === 0 ? (
				<EmptyState icon="people-outline" title={searchQuery || activeFilterCount > 0 ? t("customers.noSearchResults") : t("customers.noCustomers")} message={searchQuery || activeFilterCount > 0 ? t("customers.tryDifferentFilters") : t("customers.noCustomersMessage")} />
			) : (
				<FlatList data={leads} renderItem={renderLeadItem} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />} showsVerticalScrollIndicator={false} />
			)}

			{/* Filter Bottom Sheet */}
			{renderFilterSheet()}

			{/* Quick Note Modal */}
			<Modal visible={showQuickNoteModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowQuickNoteModal(false)}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={() => setShowQuickNoteModal(false)}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("customers.quickNote")}</Text>
						<View style={{ width: 24 }} />
					</View>

					<View style={styles.modalContent}>
						{selectedLead && (
							<View style={[styles.selectedLeadInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
								<Text style={[styles.selectedLeadName, { color: colors.text }]}>{selectedLead.full_name}</Text>
								{selectedLead.company && <Text style={[styles.selectedLeadCompany, { color: colors.textSecondary }]}>{selectedLead.company}</Text>}
							</View>
						)}

						<TextInput style={[styles.noteInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} placeholder={t("notes.notePlaceholder")} placeholderTextColor={colors.placeholder} value={quickNote} onChangeText={setQuickNote} multiline numberOfLines={5} textAlignVertical="top" />

						<Button title={savingNote ? t("common.loading") : t("common.save")} onPress={handleSaveQuickNote} disabled={!quickNote.trim() || savingNote} style={{ marginTop: Spacing.lg }} />
					</View>
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
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
	},
	headerActions: {
		flexDirection: "row",
	},
	headerButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
	},
	filterBadge: {
		position: "absolute",
		top: -4,
		right: -4,
		width: 18,
		height: 18,
		borderRadius: 9,
		justifyContent: "center",
		alignItems: "center",
	},
	filterBadgeText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "bold",
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginHorizontal: Spacing.lg,
		paddingHorizontal: Spacing.md,
		borderRadius: BorderRadius.lg,
		height: 44,
		marginBottom: Spacing.sm,
	},
	searchInput: {
		flex: 1,
		fontSize: FontSize.base,
		marginLeft: Spacing.sm,
	},
	activeFiltersBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
		marginHorizontal: Spacing.lg,
		borderRadius: BorderRadius.md,
		marginBottom: Spacing.sm,
	},
	activeFiltersText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	clearFiltersLink: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.sm,
		paddingBottom: Spacing.xxl,
	},
	// Lead card
	leadCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	leadMainContent: {
		flex: 1,
	},
	leadRow1: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	leadName: {
		fontSize: FontSize.md,
		fontWeight: "600",
		flex: 1,
		marginRight: Spacing.sm,
	},
	priorityBadge: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	priorityText: {
		fontSize: FontSize.xs,
		fontWeight: "600",
	},
	leadRow2: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 4,
	},
	statusBadge: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	statusText: {
		fontSize: FontSize.xs,
		fontWeight: "500",
	},
	leadTime: {
		fontSize: FontSize.xs,
		marginLeft: Spacing.sm,
	},
	ownerName: {
		fontSize: FontSize.xs,
		marginTop: 2,
	},
	warningBadge: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: Spacing.xs,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
		alignSelf: "flex-start",
	},
	warningText: {
		fontSize: FontSize.xs,
		marginLeft: 4,
		fontWeight: "500",
	},
	callButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: Spacing.sm,
	},
	// Filter sheet
	filterOverlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	filterOverlayBg: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	filterSheet: {
		maxHeight: SCREEN_HEIGHT * 0.85,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: Spacing.xxl,
	},
	filterHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	filterTitle: {
		fontSize: FontSize.lg,
		fontWeight: "600",
	},
	filterClearText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	filterApplyText: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	filterContent: {
		padding: Spacing.lg,
	},
	filterGroup: {
		marginBottom: Spacing.lg,
	},
	filterGroupTitle: {
		fontSize: FontSize.xs,
		fontWeight: "600",
		textTransform: "uppercase",
		marginBottom: Spacing.sm,
	},
	filterChipsWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	filterChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
	},
	filterChipText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	filterCheckboxes: {
		gap: Spacing.sm,
	},
	filterCheckbox: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	filterCheckboxText: {
		fontSize: FontSize.sm,
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
	selectedLeadInfo: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	selectedLeadName: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	selectedLeadCompany: {
		fontSize: FontSize.sm,
		marginTop: Spacing.xs,
	},
	noteInput: {
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		padding: Spacing.md,
		fontSize: FontSize.base,
		minHeight: 120,
	},
});
