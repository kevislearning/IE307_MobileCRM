import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Opportunity, Lead, OpportunityStage, OpportunityPipelineItem, OpportunityForecastItem } from "@/types";
import { Loading, EmptyState, Button, TextInput, Badge } from "@/components/ui";

const STAGE_OPTIONS: OpportunityStage[] = ["PROSPECTING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

// Stage to probability mapping (same as backend)
const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
	PROSPECTING: 20,
	PROPOSAL: 50,
	NEGOTIATION: 70,
	WON: 100,
	LOST: 0,
};

// Stage colors for badges
const STAGE_COLORS: Record<OpportunityStage, string> = {
	PROSPECTING: "#3B82F6", // Blue
	PROPOSAL: "#F59E0B", // Orange
	NEGOTIATION: "#8B5CF6", // Purple
	WON: "#10B981", // Green
	LOST: "#EF4444", // Red
};

export default function OpportunitiesScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { isManager, isAuthenticated } = useAuth();
	const { t } = useTranslation();

	const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
	const [leads, setLeads] = useState<Lead[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [pipeline, setPipeline] = useState<OpportunityPipelineItem[]>([]);
	const [forecast, setForecast] = useState<OpportunityForecastItem[]>([]);

	const [showCreateModal, setShowCreateModal] = useState(false);
	const [selectedLead, setSelectedLead] = useState<number | null>(null);
	const [showLeadPicker, setShowLeadPicker] = useState(false);
	const [leadSearchQuery, setLeadSearchQuery] = useState("");
	const [stage, setStage] = useState<OpportunityStage>("PROSPECTING");
	const [estimatedValue, setEstimatedValue] = useState("");
	const [currencyCode, setCurrencyCode] = useState("VND");
	const [expectedCloseDate, setExpectedCloseDate] = useState("");
	const [nextStep, setNextStep] = useState("");
	const [competitor, setCompetitor] = useState("");
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [creating, setCreating] = useState(false);

	const fetchOpportunities = async (isRefresh = false) => {
		if (!isAuthenticated) return;
		try {
			if (!isRefresh) setLoading(true);
			const response = await api.getOpportunities({});
			setOpportunities((response as any).data || []);
		} catch (error) {
			console.error("Error fetching opportunities:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const fetchLeads = async () => {
		if (!isAuthenticated) return;
		try {
			const response = await api.getLeads({});
			setLeads((response as any).data || []);
		} catch (error) {
			console.error("Error fetching leads:", error);
		}
	};

	useEffect(() => {
		if (!isAuthenticated) return;
		fetchLeads();
	}, [isAuthenticated]);

	useFocusEffect(
		useCallback(() => {
			if (!isAuthenticated) return;
			fetchOpportunities();
			if (isManager) {
				api.getOpportunityPipeline()
					.then((res: any) => setPipeline(res.data || res || []))
					.catch(() => undefined);
				api.getOpportunityForecast()
					.then((res: any) => setForecast(res.data || res || []))
					.catch(() => undefined);
			}
		}, [isManager, isAuthenticated]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchOpportunities(true);
		if (isManager) {
			api.getOpportunityPipeline()
				.then((res: any) => setPipeline(res.data || res || []))
				.catch(() => undefined);
			api.getOpportunityForecast()
				.then((res: any) => setForecast(res.data || res || []))
				.catch(() => undefined);
		}
	};

	const handleDateChange = (_event: any, date?: Date) => {
		if (Platform.OS === "android") {
			setShowDatePicker(false);
		}
		if (date) {
			setSelectedDate(date);
			setExpectedCloseDate(date.toISOString().split("T")[0]);
		}
	};

	const resetCreateForm = () => {
		setSelectedLead(null);
		setLeadSearchQuery("");
		setStage("PROSPECTING");
		setEstimatedValue("");
		setCurrencyCode("VND");
		setExpectedCloseDate("");
		setNextStep("");
		setCompetitor("");
		setSelectedDate(new Date());
	};

	const handleCreate = async () => {
		if (!selectedLead) return;
		setCreating(true);
		try {
			await api.createOpportunity({
				lead_id: selectedLead,
				stage,
				estimated_value: Number(estimatedValue) || 0,
				currency_code: currencyCode,
				expected_close_date: expectedCloseDate || new Date().toISOString().split("T")[0],
				next_step: nextStep,
				competitor,
			});
			resetCreateForm();
			setShowCreateModal(false);
			fetchOpportunities(true);
		} catch (error) {
			console.error("Error creating opportunity:", error);
		} finally {
			setCreating(false);
		}
	};

	const getStageColor = (s: OpportunityStage) => STAGE_COLORS[s] || colors.primary;

	const formatCurrency = (value?: number) => {
		if (value === null || value === undefined) return "-";
		return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
	};

	const getStageLabel = (value: OpportunityStage) => {
		switch (value) {
			case "PROSPECTING":
				return t("opportunities.stageProspecting");
			case "PROPOSAL":
				return t("opportunities.stageProposal");
			case "NEGOTIATION":
				return t("opportunities.stageNegotiation");
			case "WON":
				return t("opportunities.stageWon");
			case "LOST":
				return t("opportunities.stageLost");
			default:
				return value;
		}
	};

	// Calculate total pipeline value and expected revenue for summary
	const getTotalPipelineValue = () => {
		return opportunities.filter((o) => o.stage !== "LOST").reduce((sum, o) => sum + (o.estimated_value || 0), 0);
	};

	const getTotalExpectedRevenue = () => {
		return opportunities.reduce((sum, o) => sum + (o.expected_revenue || 0), 0);
	};

	const getOpportunitiesByStage = () => {
		const counts: Record<OpportunityStage, number> = {
			PROSPECTING: 0,
			PROPOSAL: 0,
			NEGOTIATION: 0,
			WON: 0,
			LOST: 0,
		};
		opportunities.forEach((o) => {
			counts[o.stage] = (counts[o.stage] || 0) + 1;
		});
		return counts;
	};

	const renderItem = ({ item }: { item: Opportunity }) => {
		const probability = STAGE_PROBABILITY[item.stage] || item.probability || 0;
		const stageColor = STAGE_COLORS[item.stage] || colors.primary;

		return (
			<TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/opportunity/${item.id}`)}>
				{/* Header: Name + Stage Badge */}
				<View style={styles.cardHeader}>
					<View style={styles.cardTitleContainer}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
							{item.lead?.full_name || `Opportunity #${item.id}`}
						</Text>
						{item.lead?.company && (
							<Text style={[styles.cardCompany, { color: colors.textSecondary }]} numberOfLines={1}>
								{item.lead.company}
							</Text>
						)}
					</View>
					<Badge label={`${getStageLabel(item.stage)} (${probability}%)`} color={stageColor} />
				</View>

				{/* Deal Value - Large and prominent */}
				<Text style={[styles.dealValue, { color: colors.text }]}>{formatCurrency(item.estimated_value)}</Text>

				{/* Expected Revenue - Smaller */}
				<View style={styles.cardFooter}>
					<Text style={[styles.expectedRevenueLabel, { color: colors.textSecondary }]}>{t("opportunities.expectedRevenue")}:</Text>
					<Text style={[styles.expectedRevenueValue, { color: colors.primary }]}>{formatCurrency(item.expected_revenue)}</Text>
				</View>

				{/* Progress bar for probability */}
				<View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
					<View style={[styles.progressBar, { width: `${probability}%`, backgroundColor: stageColor }]} />
				</View>

				{/* Sales info if available */}
				{item.owner && (
					<View style={styles.ownerRow}>
						<Ionicons name="person-outline" size={14} color={colors.textLight} />
						<Text style={[styles.ownerText, { color: colors.textLight }]}>{item.owner.name}</Text>
					</View>
				)}
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>{t("opportunities.title")}</Text>
				{isManager && (
					<TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setShowCreateModal(true)}>
						<Ionicons name="add" size={24} color={colors.white} />
					</TouchableOpacity>
				)}
			</View>

			{loading ? (
				<Loading />
			) : (
				<FlatList
					data={opportunities}
					renderItem={renderItem}
					keyExtractor={(item) => item.id.toString()}
					contentContainerStyle={styles.listContent}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
					ListHeaderComponent={
						isManager ? (
							<View style={styles.statsContainer}>
								{/* Opportunities by Stage */}
								<Text style={[styles.sectionLabel, { color: colors.text }]}>{t("opportunities.byStage")}</Text>
								<View style={styles.stageGrid}>
									{STAGE_OPTIONS.filter((s) => s !== "LOST").map((stage) => {
										const count = getOpportunitiesByStage()[stage];
										return (
											<View key={stage} style={[styles.stageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
												<View style={[styles.stageDot, { backgroundColor: STAGE_COLORS[stage] }]} />
												<Text style={[styles.stageCardLabel, { color: colors.text }]}>{getStageLabel(stage)}</Text>
												<Text style={[styles.stageCardCount, { color: colors.textSecondary }]}>{count}</Text>
											</View>
										);
									})}
								</View>

								<Text style={[styles.sectionLabel, { color: colors.text, marginTop: Spacing.md }]}>{t("opportunities.allDeals")}</Text>
							</View>
						) : null
					}
					ListEmptyComponent={<EmptyState icon="trending-up-outline" title={t("opportunities.noOpportunities")} message="" />}
				/>
			)}

			{isManager && (
				<Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
					<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
						<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
							<TouchableOpacity onPress={() => setShowCreateModal(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
							<Text style={[styles.modalTitle, { color: colors.text }]}>{t("opportunities.addOpportunity")}</Text>
							<View style={{ width: 24 }} />
						</View>
						<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContent}>
							<ScrollView showsVerticalScrollIndicator={false}>
								<Text style={[styles.sectionLabel, { color: colors.text }]}>{t("tasks.relatedCustomer")}</Text>
								<TouchableOpacity style={[styles.leadSelectButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowLeadPicker(true)} activeOpacity={0.7}>
									<Ionicons name="person-outline" size={20} color={colors.primary} style={styles.dateIcon} />
									<Text style={[styles.dateText, { color: selectedLead ? colors.text : colors.textLight, flex: 1 }]}>{selectedLead ? leads.find((l) => l.id === selectedLead)?.full_name || t("customers.customerDetail") : t("tasks.selectCustomer")}</Text>
								</TouchableOpacity>

								<Text style={[styles.sectionLabel, { color: colors.text }]}>{t("opportunities.stage")}</Text>
								<View style={styles.recurrenceRow}>
									{STAGE_OPTIONS.filter((s) => s !== "WON" && s !== "LOST").map((option) => (
										<TouchableOpacity
											key={option}
											style={[
												styles.recurrenceChip,
												{
													backgroundColor: stage === option ? getStageColor(option) : colors.surface,
													borderColor: stage === option ? getStageColor(option) : colors.border,
												},
											]}
											onPress={() => setStage(option)}>
											<Text style={[styles.assigneeText, { color: stage === option ? colors.white : colors.text }]}>
												{getStageLabel(option)} ({STAGE_PROBABILITY[option]}%)
											</Text>
										</TouchableOpacity>
									))}
								</View>

								<TextInput label={t("opportunities.dealValue")} placeholder="0" value={estimatedValue} onChangeText={setEstimatedValue} keyboardType="number-pad" />
								<TextInput label={t("opportunities.currency")} placeholder="VND" value={currencyCode} onChangeText={setCurrencyCode} />

								<View style={styles.dateFieldContainer}>
									<Text style={[styles.dateLabel, { color: colors.text }]}>{t("opportunities.expectedCloseDate")}</Text>
									<TouchableOpacity style={[styles.dateInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
										<Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.dateIcon} />
										<Text style={[styles.dateText, { color: expectedCloseDate ? colors.text : colors.textLight }]}>{expectedCloseDate ? expectedCloseDate : t("tasks.selectDueDate")}</Text>
									</TouchableOpacity>
								</View>

								<TextInput label={t("opportunities.nextStep")} placeholder="" value={nextStep} onChangeText={setNextStep} multiline numberOfLines={3} />
								<TextInput label={t("opportunities.competitor")} placeholder="" value={competitor} onChangeText={setCompetitor} />

								<Button title={t("common.add")} onPress={handleCreate} loading={creating} style={styles.submitButton} />
							</ScrollView>
						</KeyboardAvoidingView>
					</SafeAreaView>
				</Modal>
			)}

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
							<DateTimePicker value={selectedDate} mode="date" display="spinner" onChange={handleDateChange} minimumDate={new Date()} />
						</View>
					</View>
				</Modal>
			)}

			{Platform.OS === "android" && showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />}

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
							<TextInput style={[styles.searchInput, { color: colors.text }]} placeholder={t("customers.searchPlaceholder")} placeholderTextColor={colors.placeholder} value={leadSearchQuery} onChangeText={setLeadSearchQuery} />
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
								style={[styles.leadOption, { backgroundColor: selectedLead === item.id ? colors.primary + "15" : colors.card, borderColor: colors.border }]}
								onPress={() => {
									setSelectedLead(item.id);
									setShowLeadPicker(false);
								}}>
								<View style={[styles.leadAvatar, { backgroundColor: colors.primary + "20" }]}>
									<Text style={[styles.leadAvatarText, { color: colors.primary }]}>{item.full_name.charAt(0).toUpperCase()}</Text>
								</View>
								<View style={styles.leadInfo}>
									<Text style={[styles.leadName, { color: colors.text }]}>{item.full_name}</Text>
									{item.company && <Text style={[styles.leadCompany, { color: colors.textSecondary }]}>{item.company}</Text>}
								</View>
							</TouchableOpacity>
						)}
						contentContainerStyle={styles.leadListContent}
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
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
	},
	addButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	card: {
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginBottom: Spacing.md,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: Spacing.sm,
	},
	cardTitleContainer: {
		flex: 1,
		marginRight: Spacing.sm,
	},
	cardTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	cardCompany: {
		fontSize: FontSize.sm,
		marginTop: 2,
	},
	dealValue: {
		fontSize: FontSize.xl,
		fontWeight: "bold",
		marginBottom: Spacing.xs,
	},
	cardFooter: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing.sm,
	},
	expectedRevenueLabel: {
		fontSize: FontSize.sm,
		marginRight: Spacing.xs,
	},
	expectedRevenueValue: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	progressBarContainer: {
		height: 4,
		borderRadius: 2,
		marginBottom: Spacing.sm,
	},
	progressBar: {
		height: 4,
		borderRadius: 2,
	},
	ownerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	ownerText: {
		fontSize: FontSize.xs,
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
	},
	dateFieldContainer: {
		marginBottom: Spacing.md,
	},
	dateLabel: {
		fontSize: FontSize.sm,
		fontWeight: "500",
		marginBottom: Spacing.xs,
	},
	dateInput: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
	},
	dateIcon: {
		marginRight: Spacing.sm,
	},
	dateText: {
		fontSize: FontSize.base,
		flex: 1,
	},
	datePickerModal: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	datePickerContainer: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 20,
	},
	datePickerHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
	},
	datePickerButton: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	sectionLabel: {
		fontSize: FontSize.sm,
		fontWeight: "500",
		marginBottom: Spacing.sm,
		marginTop: Spacing.md,
	},
	statsContainer: {
		marginBottom: Spacing.lg,
	},
	summaryRow: {
		flexDirection: "row",
		gap: Spacing.md,
		marginBottom: Spacing.md,
	},
	summaryCard: {
		flex: 1,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	summaryLabel: {
		fontSize: FontSize.xs,
		marginBottom: Spacing.xs,
	},
	summaryValue: {
		fontSize: FontSize.lg,
		fontWeight: "bold",
	},
	stageGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
	},
	stageCard: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		gap: Spacing.xs,
	},
	stageDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	stageCardLabel: {
		fontSize: FontSize.sm,
	},
	stageCardCount: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	statRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
	},
	statLabel: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	statValue: {
		fontSize: FontSize.sm,
	},
	emptyText: {
		fontSize: FontSize.sm,
		marginBottom: Spacing.sm,
	},
	recurrenceRow: {
		flexDirection: "row",
		gap: Spacing.sm,
		marginBottom: Spacing.sm,
	},
	recurrenceChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
	},
	assigneeText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	leadSelectButton: {
		flexDirection: "row",
		alignItems: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		marginBottom: Spacing.sm,
	},
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
	leadCompany: {
		fontSize: FontSize.sm,
		marginTop: 2,
	},
});
