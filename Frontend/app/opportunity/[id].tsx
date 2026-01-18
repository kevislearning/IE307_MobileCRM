import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Opportunity, OpportunityStage } from "@/types";
import { Loading, Badge, Button, TextInput } from "@/components/ui";

const STAGE_OPTIONS: OpportunityStage[] = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

// Stage to probability mapping (same as backend)
const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
	NEW: 10,
	QUALIFIED: 30,
	PROPOSAL: 50,
	NEGOTIATION: 70,
	WON: 100,
	LOST: 0,
};

// Stage colors for badges
const STAGE_COLORS: Record<OpportunityStage, string> = {
	NEW: "#6B7280", // Gray
	QUALIFIED: "#3B82F6", // Blue
	PROPOSAL: "#F59E0B", // Orange
	NEGOTIATION: "#8B5CF6", // Purple
	WON: "#10B981", // Green
	LOST: "#EF4444", // Red
};

export default function OpportunityDetailScreen() {
	const { id } = useLocalSearchParams();
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { t } = useTranslation();

	const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [showLineItemModal, setShowLineItemModal] = useState(false);
	const [lineItemName, setLineItemName] = useState("");
	const [lineItemQty, setLineItemQty] = useState("1");
	const [lineItemPrice, setLineItemPrice] = useState("");

	const fetchOpportunity = async (isRefresh = false) => {
		try {
			if (!isRefresh) setLoading(true);
			const response = await api.getOpportunity(Number(id));
			setOpportunity((response as any).data);
		} catch (error) {
			console.error("Error fetching opportunity:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			fetchOpportunity();
		}, [id])
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchOpportunity(true);
	};

	const formatCurrency = (value?: number) => {
		if (value === null || value === undefined) return "-";
		return new Intl.NumberFormat("vi-VN", { style: "currency", currency: opportunity?.currency_code || "VND" }).format(value);
	};

	const getStageLabel = (value: OpportunityStage) => {
		switch (value) {
			case "NEW":
				return t("opportunities.stageNew");
			case "QUALIFIED":
				return t("opportunities.stageQualified");
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

	const getStageColor = (stage: OpportunityStage) => STAGE_COLORS[stage] || colors.primary;

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Loading />
			</SafeAreaView>
		);
	}

	if (!opportunity) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.errorText, { color: colors.error }]}>{t("opportunities.noOpportunities")}</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text }]}>{t("opportunities.detail")}</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}>
				{/* Main Info Card */}
				<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.title, { color: colors.text }]}>{opportunity.lead?.full_name || `Opportunity #${opportunity.id}`}</Text>
					{opportunity.lead?.company && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{opportunity.lead.company}</Text>}
					<Badge label={`${getStageLabel(opportunity.stage)} (${STAGE_PROBABILITY[opportunity.stage]}%)`} color={getStageColor(opportunity.stage)} />
				</View>

				{/* Deal Value Card - Prominent */}
				<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("opportunities.dealValue")}</Text>
					<Text style={[styles.dealValueLarge, { color: colors.text }]}>{formatCurrency(opportunity.estimated_value)}</Text>

					<View style={styles.calculatedRow}>
						<View style={styles.calculatedItem}>
							<Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>{t("opportunities.probability")}</Text>
							<Text style={[styles.calculatedValue, { color: colors.text }]}>{STAGE_PROBABILITY[opportunity.stage]}%</Text>
						</View>
						<View style={styles.calculatedItem}>
							<Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>{t("opportunities.expectedRevenue")}</Text>
							<Text style={[styles.calculatedValue, { color: colors.primary }]}>{formatCurrency(opportunity.expected_revenue)}</Text>
						</View>
					</View>

					{/* Progress bar */}
					<View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
						<View style={[styles.progressBar, { width: `${STAGE_PROBABILITY[opportunity.stage]}%`, backgroundColor: getStageColor(opportunity.stage) }]} />
					</View>
				</View>

				{/* Stage Selection Card */}
				<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("opportunities.changeStage")}</Text>
					<View style={styles.stageRow}>
						{STAGE_OPTIONS.map((stage) => (
							<TouchableOpacity
								key={stage}
								style={[
									styles.stageChip,
									{
										backgroundColor: opportunity.stage === stage ? getStageColor(stage) : colors.surface,
										borderColor: opportunity.stage === stage ? getStageColor(stage) : colors.border,
									},
								]}
								onPress={async () => {
									await api.updateOpportunity(opportunity.id, { stage });
									fetchOpportunity(true);
								}}>
								<Text style={[styles.stageText, { color: opportunity.stage === stage ? colors.white : colors.text }]}>{getStageLabel(stage)}</Text>
								<Text style={[styles.stagePercent, { color: opportunity.stage === stage ? colors.white : colors.textLight }]}>{STAGE_PROBABILITY[stage]}%</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Sales & Details Card */}
				<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("opportunities.details")}</Text>

					{opportunity.owner && (
						<View style={styles.row}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>{t("opportunities.salesOwner")}</Text>
							<Text style={[styles.value, { color: colors.text }]}>{opportunity.owner.name}</Text>
						</View>
					)}

					{opportunity.expected_close_date && (
						<View style={styles.row}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>{t("opportunities.expectedCloseDate")}</Text>
							<Text style={[styles.value, { color: colors.text }]}>{opportunity.expected_close_date}</Text>
						</View>
					)}

					{opportunity.next_step && (
						<View style={styles.row}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>{t("opportunities.nextStep")}</Text>
							<Text style={[styles.value, { color: colors.text }]}>{opportunity.next_step}</Text>
						</View>
					)}

					{opportunity.competitor && (
						<View style={styles.row}>
							<Text style={[styles.label, { color: colors.textSecondary }]}>{t("opportunities.competitor")}</Text>
							<Text style={[styles.value, { color: colors.text }]}>{opportunity.competitor}</Text>
						</View>
					)}
				</View>

				{/* Line Items Card */}
				<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("opportunities.lineItems")}</Text>
					{(opportunity.line_items || []).length === 0 ? (
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("opportunities.noLineItems")}</Text>
					) : (
						opportunity.line_items?.map((item) => (
							<View key={item.id} style={styles.row}>
								<Text style={[styles.label, { color: colors.textSecondary }]}>{item.product_name}</Text>
								<Text style={[styles.value, { color: colors.text }]}>{formatCurrency(item.total_price)}</Text>
							</View>
						))
					)}
					<Button title={t("opportunities.addLineItem")} onPress={() => setShowLineItemModal(true)} style={styles.submitButton} />
				</View>

				{/* Stage History Card */}
				{(opportunity.stage_history || []).length > 0 && (
					<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("opportunities.stageHistory")}</Text>
						{opportunity.stage_history?.map((item) => (
							<View key={item.id} style={styles.historyRow}>
								<View style={styles.historyContent}>
									<Text style={[styles.historyText, { color: colors.text }]}>{item.from_stage ? `${getStageLabel(item.from_stage)} → ${getStageLabel(item.to_stage)}` : getStageLabel(item.to_stage)}</Text>
									{item.changer && <Text style={[styles.historyUser, { color: colors.textLight }]}>{item.changer.name}</Text>}
								</View>
								<Text style={[styles.historyDate, { color: colors.textLight }]}>{item.changed_at || ""}</Text>
							</View>
						))}
					</View>
				)}
			</ScrollView>

			<Modal visible={showLineItemModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLineItemModal(false)}>
				<SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
					<View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
						<TouchableOpacity onPress={() => setShowLineItemModal(false)}>
							<Ionicons name="close" size={24} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{t("opportunities.addLineItem")}</Text>
						<View style={{ width: 24 }} />
					</View>
					<View style={styles.modalContent}>
						<TextInput label={t("opportunities.productName")} value={lineItemName} onChangeText={setLineItemName} />
						<TextInput label={t("opportunities.quantity")} value={lineItemQty} onChangeText={setLineItemQty} keyboardType="number-pad" />
						<TextInput label={t("opportunities.unitPrice")} value={lineItemPrice} onChangeText={setLineItemPrice} keyboardType="number-pad" />
						<Button
							title={t("common.add")}
							onPress={async () => {
								await api.createOpportunityLineItem(opportunity.id, {
									product_name: lineItemName,
									quantity: Number(lineItemQty) || 1,
									unit_price: Number(lineItemPrice) || 0,
								});
								setLineItemName("");
								setLineItemQty("1");
								setLineItemPrice("");
								setShowLineItemModal(false);
								fetchOpportunity(true);
							}}
							style={styles.submitButton}
						/>
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
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	headerTitle: {
		fontSize: FontSize.lg,
		fontWeight: "600",
	},
	content: {
		flex: 1,
	},
	card: {
		margin: Spacing.lg,
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	title: {
		fontSize: FontSize.xl,
		fontWeight: "bold",
		marginBottom: Spacing.xs,
	},
	subtitle: {
		fontSize: FontSize.sm,
		marginBottom: Spacing.sm,
	},
	sectionTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
		marginBottom: Spacing.md,
	},
	dealValueLarge: {
		fontSize: 28,
		fontWeight: "bold",
		marginBottom: Spacing.md,
	},
	calculatedRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing.md,
	},
	calculatedItem: {
		flex: 1,
	},
	calculatedLabel: {
		fontSize: FontSize.xs,
		marginBottom: 2,
	},
	calculatedValue: {
		fontSize: FontSize.lg,
		fontWeight: "600",
	},
	progressBarContainer: {
		height: 6,
		borderRadius: 3,
	},
	progressBar: {
		height: 6,
		borderRadius: 3,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing.sm,
		paddingVertical: Spacing.xs,
	},
	label: {
		fontSize: FontSize.sm,
		flex: 1,
	},
	value: {
		fontSize: FontSize.sm,
		fontWeight: "600",
		flex: 1,
		textAlign: "right",
	},
	stageRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
		marginBottom: Spacing.sm,
	},
	stageChip: {
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		alignItems: "center",
	},
	stageText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	stagePercent: {
		fontSize: FontSize.xs,
		marginTop: 2,
	},
	historyRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: "#f0f0f0",
	},
	historyContent: {
		flex: 1,
	},
	historyText: {
		fontSize: FontSize.sm,
	},
	historyUser: {
		fontSize: FontSize.xs,
		marginTop: 2,
	},
	historyDate: {
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
	emptyText: {
		textAlign: "center",
		fontSize: FontSize.sm,
		marginTop: Spacing.md,
	},
	errorText: {
		textAlign: "center",
		fontSize: FontSize.md,
		marginTop: Spacing.xl,
	},
});
