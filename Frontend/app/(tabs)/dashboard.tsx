import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { DashboardAnalytics, OpportunityStage } from "@/types";
import { Loading, EmptyState } from "@/components/ui";

// Stage colors matching opportunities page
const STAGE_COLORS: Record<OpportunityStage, string> = {
	NEW: "#6B7280",
	QUALIFIED: "#3B82F6",
	PROPOSAL: "#F59E0B",
	NEGOTIATION: "#8B5CF6",
	WON: "#10B981",
	LOST: "#EF4444",
};

const STAGE_ORDER: OpportunityStage[] = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];

export default function DashboardScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { isAuthenticated } = useAuth();
	const { t } = useTranslation();

	const [data, setData] = useState<DashboardAnalytics | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchDashboard = async (isRefresh = false) => {
		if (!isAuthenticated) return;
		try {
			if (!isRefresh) setLoading(true);
			const response: any = await api.getDashboard();
			setData(response.data || response);
		} catch (error) {
			console.error("Error fetching dashboard:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (!isAuthenticated) return;
			fetchDashboard();
		}, [isAuthenticated]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchDashboard(true);
	};

	const formatCurrency = (value?: number) => {
		if (value === null || value === undefined) return "0 ₫";
		if (value >= 1000000000) {
			return `${(value / 1000000000).toFixed(1)}B ₫`;
		}
		if (value >= 1000000) {
			return `${(value / 1000000).toFixed(0)}M ₫`;
		}
		return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
	};

	const formatCurrencyFull = (value?: number) => {
		if (value === null || value === undefined) return "0 ₫";
		return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
	};

	const getStageLabel = (stage: OpportunityStage) => {
		switch (stage) {
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
				return stage;
		}
	};

	// Sort pipeline by stage order
	const getSortedPipeline = () => {
		if (!data?.pipeline_by_stage) return [];
		return [...data.pipeline_by_stage].sort((a, b) => {
			return STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
		});
	};

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Loading />
			</SafeAreaView>
		);
	}

	if (!data) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<EmptyState icon="stats-chart-outline" title={t("dashboard.title")} message={t("common.noData")} />
			</SafeAreaView>
		);
	}

	const sortedPipeline = getSortedPipeline();
	const totalDeals = sortedPipeline.reduce((sum, item) => sum + item.total_deals, 0);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}>
				<Text style={[styles.title, { color: colors.text }]}>{t("dashboard.title")}</Text>

				{/* === SECTION 1: OVERVIEW === */}
				<View style={styles.overviewSection}>
					{/* Total Pipeline Value - Large Card */}
					<View style={[styles.overviewCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.overviewIconContainer}>
							<Ionicons name="trending-up" size={24} color={colors.primary} />
						</View>
						<Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>{t("dashboard.totalPipeline")}</Text>
						<Text style={[styles.overviewValueLarge, { color: colors.text }]}>{formatCurrencyFull(data.total_pipeline_value)}</Text>
					</View>

					{/* Forecast Revenue */}
					<View style={styles.overviewRow}>
						<View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
							<Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>{t("dashboard.forecastRevenue")}</Text>
							<Text style={[styles.overviewValue, { color: colors.primary }]}>{formatCurrency(data.forecast_revenue)}</Text>
						</View>
						<View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
							<Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>{t("dashboard.forecastThisMonth")}</Text>
							<Text style={[styles.overviewValue, { color: colors.success }]}>{formatCurrency(data.forecast_this_month)}</Text>
						</View>
					</View>
				</View>

				{/* === SECTION 2: PIPELINE BY STAGE === */}
				<View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashboard.pipelineByStage")}</Text>
						<Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
							{totalDeals} {t("dashboard.deals")}
						</Text>
					</View>

					{/* Pipeline Bar */}
					{totalDeals > 0 && (
						<View style={styles.pipelineBar}>
							{sortedPipeline.map((item) => {
								const width = (item.total_deals / totalDeals) * 100;
								if (width === 0) return null;
								return <View key={item.stage} style={[styles.pipelineSegment, { backgroundColor: STAGE_COLORS[item.stage], width: `${width}%` }]} />;
							})}
						</View>
					)}

					{/* Pipeline List */}
					<View style={styles.pipelineList}>
						{sortedPipeline.map((item) => (
							<TouchableOpacity key={item.stage} style={[styles.pipelineItem, { borderColor: colors.border }]} onPress={() => router.push("/opportunities")} activeOpacity={0.7}>
								<View style={styles.pipelineItemLeft}>
									<View style={[styles.stageDot, { backgroundColor: STAGE_COLORS[item.stage] }]} />
									<Text style={[styles.pipelineStage, { color: colors.text }]}>{getStageLabel(item.stage)}</Text>
									<View style={[styles.dealCountBadge, { backgroundColor: colors.surface }]}>
										<Text style={[styles.dealCountText, { color: colors.textSecondary }]}>{item.total_deals}</Text>
									</View>
								</View>
								<View style={styles.pipelineItemRight}>
									<Text style={[styles.pipelineValue, { color: colors.text }]}>{formatCurrency(item.total_value)}</Text>
									<Text style={[styles.pipelineExpected, { color: colors.textLight }]}>→ {formatCurrency(item.expected_revenue)}</Text>
								</View>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* === SECTION 3: BOTTLENECK WARNING === */}
				{data.bottleneck && data.bottleneck.avg_days > 7 && (
					<View style={[styles.bottleneckCard, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
						<View style={styles.bottleneckHeader}>
							<Ionicons name="warning" size={24} color="#D97706" />
							<Text style={[styles.bottleneckTitle, { color: "#92400E" }]}>{t("dashboard.bottleneckDetected")}</Text>
						</View>
						<Text style={[styles.bottleneckStage, { color: "#78350F" }]}>
							{getStageLabel(data.bottleneck.stage)} – {data.bottleneck.avg_days} {t("dashboard.days")}
						</Text>
						<Text style={[styles.bottleneckDeals, { color: "#92400E" }]}>
							{data.bottleneck.total_deals} {t("dashboard.dealsStuck")}
						</Text>
					</View>
				)}

				{/* === SECTION 4: SALES PERFORMANCE === */}
				{data.sales_performance && data.sales_performance.length > 0 && (
					<View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashboard.salesPerformance")}</Text>

						{/* Header */}
						<View style={[styles.salesHeader, { borderColor: colors.border }]}>
							<Text style={[styles.salesHeaderCell, styles.salesNameCell, { color: colors.textLight }]}>{t("dashboard.salesName")}</Text>
							<Text style={[styles.salesHeaderCell, styles.salesStatCell, { color: colors.textLight }]}>{t("dashboard.won")}</Text>
							<Text style={[styles.salesHeaderCell, styles.salesStatCell, { color: colors.textLight }]}>{t("dashboard.winRate")}</Text>
							<Text style={[styles.salesHeaderCell, styles.salesRevenueCell, { color: colors.textLight }]}>{t("dashboard.revenue")}</Text>
						</View>

						{/* Sales List */}
						{data.sales_performance.map((sales, index) => (
							<View key={sales.sales_id} style={[styles.salesRow, { borderColor: colors.border }, index === data.sales_performance.length - 1 && { borderBottomWidth: 0 }]}>
								<View style={[styles.salesCell, styles.salesNameCell]}>
									<Text style={[styles.salesName, { color: colors.text }]}>{sales.sales_name}</Text>
									{sales.avg_deal_time && <Text style={[styles.salesAvgTime, { color: colors.textLight }]}>~{sales.avg_deal_time}d</Text>}
								</View>
								<Text style={[styles.salesCell, styles.salesStatCell, styles.salesStatText, { color: colors.text }]}>
									{sales.won_deals}/{sales.total_deals}
								</Text>
								<Text style={[styles.salesCell, styles.salesStatCell, styles.salesStatText, { color: sales.win_rate >= 50 ? colors.success : colors.text }]}>{sales.win_rate}%</Text>
								<Text style={[styles.salesCell, styles.salesRevenueCell, styles.salesRevenueText, { color: colors.primary }]}>{formatCurrency(sales.revenue)}</Text>
							</View>
						))}
					</View>
				)}

				{/* === QUICK STATS (Legacy) === */}
				<View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dashboard.quickStats")}</Text>
					<View style={styles.quickStatsGrid}>
						<View style={[styles.quickStatItem, { backgroundColor: colors.surface }]}>
							<Ionicons name="people-outline" size={20} color={colors.textSecondary} />
							<Text style={[styles.quickStatValue, { color: colors.text }]}>{data.leads_total}</Text>
							<Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>{t("dashboard.leadsTotal")}</Text>
						</View>
						<View style={[styles.quickStatItem, { backgroundColor: colors.surface }]}>
							<Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
							<Text style={[styles.quickStatValue, { color: colors.text }]}>{data.leads_stale_7d}</Text>
							<Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>{t("dashboard.leadsStale")}</Text>
						</View>
						<View style={[styles.quickStatItem, { backgroundColor: colors.surface }]}>
							<Ionicons name="checkbox-outline" size={20} color={colors.primary} />
							<Text style={[styles.quickStatValue, { color: colors.text }]}>{data.tasks_today}</Text>
							<Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>{t("dashboard.tasksToday")}</Text>
						</View>
						<View style={[styles.quickStatItem, { backgroundColor: colors.surface }]}>
							<Ionicons name="time-outline" size={20} color="#EF4444" />
							<Text style={[styles.quickStatValue, { color: colors.text }]}>{data.tasks_overdue}</Text>
							<Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>{t("dashboard.tasksOverdue")}</Text>
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		padding: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
		marginBottom: Spacing.lg,
	},

	// Overview Section
	overviewSection: {
		marginBottom: Spacing.lg,
	},
	overviewCardLarge: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.lg,
		marginBottom: Spacing.md,
	},
	overviewIconContainer: {
		marginBottom: Spacing.sm,
	},
	overviewLabel: {
		fontSize: FontSize.sm,
		marginBottom: Spacing.xs,
	},
	overviewValueLarge: {
		fontSize: 28,
		fontWeight: "bold",
	},
	overviewRow: {
		flexDirection: "row",
		gap: Spacing.md,
	},
	overviewCard: {
		flex: 1,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
	},
	overviewValue: {
		fontSize: FontSize.lg,
		fontWeight: "bold",
	},

	// Section Card
	sectionCard: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
		marginBottom: Spacing.lg,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: Spacing.md,
	},
	sectionTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	sectionSubtitle: {
		fontSize: FontSize.sm,
	},

	// Pipeline Bar
	pipelineBar: {
		flexDirection: "row",
		height: 8,
		borderRadius: 4,
		overflow: "hidden",
		marginBottom: Spacing.md,
	},
	pipelineSegment: {
		height: "100%",
	},

	// Pipeline List
	pipelineList: {
		gap: Spacing.xs,
	},
	pipelineItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
	},
	pipelineItemLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	stageDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	pipelineStage: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	dealCountBadge: {
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
		borderRadius: BorderRadius.sm,
	},
	dealCountText: {
		fontSize: FontSize.xs,
		fontWeight: "500",
	},
	pipelineItemRight: {
		alignItems: "flex-end",
	},
	pipelineValue: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	pipelineExpected: {
		fontSize: FontSize.xs,
	},

	// Bottleneck Card
	bottleneckCard: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
		marginBottom: Spacing.lg,
	},
	bottleneckHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		marginBottom: Spacing.xs,
	},
	bottleneckTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
	bottleneckStage: {
		fontSize: FontSize.lg,
		fontWeight: "bold",
		marginBottom: Spacing.xs,
	},
	bottleneckDeals: {
		fontSize: FontSize.sm,
	},

	// Sales Performance
	salesHeader: {
		flexDirection: "row",
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
	},
	salesHeaderCell: {
		fontSize: FontSize.xs,
		fontWeight: "500",
	},
	salesRow: {
		flexDirection: "row",
		paddingVertical: Spacing.sm,
		borderBottomWidth: 1,
		alignItems: "center",
	},
	salesCell: {
		justifyContent: "center",
	},
	salesNameCell: {
		flex: 2,
	},
	salesStatCell: {
		flex: 1,
		alignItems: "center",
	},
	salesRevenueCell: {
		flex: 1.5,
		alignItems: "flex-end",
	},
	salesName: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	salesAvgTime: {
		fontSize: FontSize.xs,
	},
	salesStatText: {
		fontSize: FontSize.sm,
		textAlign: "center",
	},
	salesRevenueText: {
		fontSize: FontSize.sm,
		fontWeight: "600",
		textAlign: "right",
	},

	// Quick Stats
	quickStatsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
		marginTop: Spacing.sm,
	},
	quickStatItem: {
		flexBasis: "48%",
		padding: Spacing.md,
		borderRadius: BorderRadius.md,
		alignItems: "center",
		gap: Spacing.xs,
	},
	quickStatValue: {
		fontSize: FontSize.xl,
		fontWeight: "bold",
	},
	quickStatLabel: {
		fontSize: FontSize.xs,
		textAlign: "center",
	},
});
