import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Loading } from "@/components/ui";
import { Language } from "@/i18n";

type TabType = "info" | "performance" | "settings";
type ThemeOption = "light" | "dark" | "system";

interface ProfileStats {
	// Sales stats
	customersManaged?: number;
	overdueTasksCount?: number;
	followUpToday?: number;
	tasksCompletedMonth?: number;
	customersBought30?: number;
	customersBought90?: number;

	// Manager stats
	teamMemberCount?: number;
	customersNoFollowUp?: number;
	openDealsCount?: number;
	expectedRevenue?: number;
	conversionRate?: number;
	teamOverdueTasks?: number;
}

export default function ProfileScreen() {
	const { theme, colorScheme, setTheme } = useTheme();
	const colors = Colors[colorScheme];
	const { user, logout, isManager, isSales, isAuthenticated } = useAuth();
	const { language, setLanguage, t } = useLanguage();

	const [activeTab, setActiveTab] = useState<TabType>("info");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [profileDetails, setProfileDetails] = useState<any | null>(null);
	const [stats, setStats] = useState<ProfileStats>({});
	const [saving, setSaving] = useState(false);

	// Settings states
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [reminderTime, setReminderTime] = useState<number>(15); // minutes before
	const [workingDays, setWorkingDays] = useState<string>("mon-fri");
	const [workingHoursFrom, setWorkingHoursFrom] = useState("08:30");
	const [workingHoursTo, setWorkingHoursTo] = useState("18:00");

	const fetchProfileData = async (isRefresh = false) => {
		if (!isAuthenticated) return;
		try {
			if (!isRefresh) setLoading(true);

			// Fetch profile info
			const profileRes = await api.getProfile();
			const profile = (profileRes as any).user;
			setProfileDetails(profile || null);

			// Load settings
			setNotificationsEnabled(profile?.notifications_enabled ?? true);
			setReminderTime(profile?.reminder_minutes ?? 15);
			setWorkingDays(profile?.working_days ?? "mon-fri");
			setWorkingHoursFrom(profile?.working_hours_from ?? "08:30");
			setWorkingHoursTo(profile?.working_hours_to ?? "18:00");

			// Fetch stats based on role
			await fetchStats();
		} catch (error) {
			console.error("Error fetching profile data:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const fetchStats = async () => {
		try {
			// Get dashboard stats for summary
			const dashboardRes = await api.getDashboard();
			const dashboardData = (dashboardRes as any).data || dashboardRes;

			if (isManager) {
				setStats({
					teamMemberCount: dashboardData.team_member_count || 0,
					customersNoFollowUp: dashboardData.leads_no_followup || 0,
					openDealsCount: dashboardData.open_deals || 0,
					expectedRevenue: dashboardData.expected_revenue || 0,
					conversionRate: dashboardData.conversion_rate || 0,
					teamOverdueTasks: dashboardData.overdue_tasks || 0,
				});
			} else {
				setStats({
					customersManaged: dashboardData.total_leads || 0,
					overdueTasksCount: dashboardData.overdue_tasks || 0,
					followUpToday: dashboardData.followup_today || 0,
					tasksCompletedMonth: dashboardData.tasks_completed_month || 0,
					customersBought30: dashboardData.customers_converted_30 || 0,
					customersBought90: dashboardData.customers_converted_90 || 0,
				});
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (!isAuthenticated) return;
			fetchProfileData();
		}, [isAuthenticated]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchProfileData(true);
	};

	const handleLogout = () => {
		Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("auth.logout"),
				style: "destructive",
				onPress: async () => {
					await logout();
					router.replace("/auth/welcome");
				},
			},
		]);
	};

	const updateSetting = async (key: string, value: any) => {
		setSaving(true);
		try {
			await api.updateSettings({ [key]: value });
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("settings.cannotUpdateSettings"));
			// Revert on error - refetch
			fetchProfileData(true);
		} finally {
			setSaving(false);
		}
	};

	const handleNotificationToggle = async (value: boolean) => {
		setNotificationsEnabled(value);
		await updateSetting("notifications_enabled", value);
	};

	const handleThemeChange = async (newTheme: ThemeOption) => {
		await setTheme(newTheme);
		await updateSetting("theme", newTheme);
	};

	const handleLanguageChange = async (newLanguage: Language) => {
		await setLanguage(newLanguage);
		await updateSetting("language", newLanguage);
	};

	const handleReminderChange = async (minutes: number) => {
		setReminderTime(minutes);
		await updateSetting("reminder_minutes", minutes);
	};

	const handleWorkingDaysChange = async (days: string) => {
		setWorkingDays(days);
		await updateSetting("working_days", days);
	};

	const getRoleLabel = () => {
		if (isManager) return t("profile.roleManager");
		if (isSales) return t("profile.roleSales");
		return t("profile.roleStaff");
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return t("profile.notSet");
		return new Date(dateString).toLocaleDateString("vi-VN", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const formatCurrency = (value?: number) => {
		if (!value) return "0đ";
		if (value >= 1000000000) {
			return `${(value / 1000000000).toFixed(1)}tỷ`;
		}
		if (value >= 1000000) {
			return `${(value / 1000000).toFixed(0)}tr`;
		}
		return `${value.toLocaleString("vi-VN")}đ`;
	};

	// Summary cards based on role
	const renderSummaryCards = () => {
		if (isManager) {
			return (
				<View style={styles.summaryContainer}>
					<View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={[styles.summaryIconBox, { backgroundColor: colors.primary + "15" }]}>
							<Ionicons name="people" size={20} color={colors.primary} />
						</View>
						<Text style={[styles.summaryValue, { color: colors.text }]}>{stats.teamMemberCount || 0}</Text>
						<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t("profile.teamMembers")}</Text>
					</View>

					<View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={[styles.summaryIconBox, { backgroundColor: colors.warning + "15" }]}>
							<Ionicons name="alert-circle" size={20} color={colors.warning} />
						</View>
						<Text style={[styles.summaryValue, { color: colors.text }]}>{stats.customersNoFollowUp || 0}</Text>
						<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t("profile.noFollowUp")}</Text>
					</View>

					<View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={[styles.summaryIconBox, { backgroundColor: colors.success + "15" }]}>
							<Ionicons name="briefcase" size={20} color={colors.success} />
						</View>
						<Text style={[styles.summaryValue, { color: colors.text }]}>{stats.openDealsCount || 0}</Text>
						<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t("profile.openDeals")}</Text>
					</View>
				</View>
			);
		}

		// Sales summary cards
		return (
			<View style={styles.summaryContainer}>
				<View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={[styles.summaryIconBox, { backgroundColor: colors.primary + "15" }]}>
						<Ionicons name="person" size={20} color={colors.primary} />
					</View>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{stats.customersManaged || 0}</Text>
					<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t("profile.customersManaged")}</Text>
				</View>

				<View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={[styles.summaryIconBox, { backgroundColor: colors.error + "15" }]}>
						<Ionicons name="alert-circle" size={20} color={colors.error} />
					</View>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{stats.overdueTasksCount || 0}</Text>
					<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t("profile.overdueTasks")}</Text>
				</View>

				<View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={[styles.summaryIconBox, { backgroundColor: colors.warning + "15" }]}>
						<Ionicons name="call" size={20} color={colors.warning} />
					</View>
					<Text style={[styles.summaryValue, { color: colors.text }]}>{stats.followUpToday || 0}</Text>
					<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t("profile.followUpToday")}</Text>
				</View>
			</View>
		);
	};

	// Tab: Information
	const renderInfoTab = () => (
		<View style={styles.tabContent}>
			<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={styles.infoRow}>
					<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("profile.fullName")}</Text>
					<Text style={[styles.infoValue, { color: colors.text }]}>{profileDetails?.name || user?.name || t("profile.notSet")}</Text>
				</View>

				<View style={[styles.infoRow, styles.infoRowBorder, { borderTopColor: colors.border }]}>
					<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("profile.email")}</Text>
					<Text style={[styles.infoValue, { color: colors.text }]}>{profileDetails?.email || user?.email || t("profile.notSet")}</Text>
				</View>

				<View style={[styles.infoRow, styles.infoRowBorder, { borderTopColor: colors.border }]}>
					<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("profile.phone")}</Text>
					<Text style={[styles.infoValue, { color: colors.text }]}>{profileDetails?.phone || t("profile.notSet")}</Text>
				</View>

				<View style={[styles.infoRow, styles.infoRowBorder, { borderTopColor: colors.border }]}>
					<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("profile.role")}</Text>
					<Text style={[styles.infoValue, { color: colors.text }]}>{getRoleLabel()}</Text>
				</View>

				<View style={[styles.infoRow, styles.infoRowBorder, { borderTopColor: colors.border }]}>
					<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("profile.team")}</Text>
					<Text style={[styles.infoValue, { color: colors.text }]}>{profileDetails?.team_name || t("profile.notSet")}</Text>
				</View>

				<View style={[styles.infoRow, styles.infoRowBorder, { borderTopColor: colors.border }]}>
					<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t("profile.joinedDate")}</Text>
					<Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(profileDetails?.created_at)}</Text>
				</View>
			</View>

			<Text style={[styles.infoNote, { color: colors.textLight }]}>{t("profile.infoNote")}</Text>
		</View>
	);

	// Tab: Performance
	const renderPerformanceTab = () => {
		if (isManager) {
			return (
				<View style={styles.tabContent}>
					<View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.statsRow}>
							<View style={styles.statItem}>
								<Ionicons name="briefcase-outline" size={24} color={colors.primary} />
								<Text style={[styles.statValue, { color: colors.text }]}>{stats.openDealsCount || 0}</Text>
								<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.totalOpenDeals")}</Text>
							</View>

							<View style={[styles.statDivider, { backgroundColor: colors.border }]} />

							<View style={styles.statItem}>
								<Ionicons name="cash-outline" size={24} color={colors.success} />
								<Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats.expectedRevenue)}</Text>
								<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.expectedRevenue")}</Text>
							</View>
						</View>
					</View>

					<View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.statsRow}>
							<View style={styles.statItem}>
								<Ionicons name="trending-up-outline" size={24} color={colors.warning} />
								<Text style={[styles.statValue, { color: colors.text }]}>{stats.conversionRate || 0}%</Text>
								<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.conversionRate")}</Text>
							</View>

							<View style={[styles.statDivider, { backgroundColor: colors.border }]} />

							<View style={styles.statItem}>
								<Ionicons name="alert-circle-outline" size={24} color={colors.error} />
								<Text style={[styles.statValue, { color: colors.text }]}>{stats.teamOverdueTasks || 0}</Text>
								<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.teamOverdueTasks")}</Text>
							</View>
						</View>
					</View>
				</View>
			);
		}

		// Sales performance
		return (
			<View style={styles.tabContent}>
				<View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.statsRow}>
						<View style={styles.statItem}>
							<Ionicons name="people-outline" size={24} color={colors.primary} />
							<Text style={[styles.statValue, { color: colors.text }]}>{stats.customersManaged || 0}</Text>
							<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.customersManaged")}</Text>
						</View>

						<View style={[styles.statDivider, { backgroundColor: colors.border }]} />

						<View style={styles.statItem}>
							<Ionicons name="checkmark-done-outline" size={24} color={colors.success} />
							<Text style={[styles.statValue, { color: colors.text }]}>{stats.tasksCompletedMonth || 0}</Text>
							<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.tasksCompleted30")}</Text>
						</View>
					</View>
				</View>

				<View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.statsRow}>
						<View style={styles.statItem}>
							<Ionicons name="alert-circle-outline" size={24} color={colors.error} />
							<Text style={[styles.statValue, { color: colors.text }]}>{stats.overdueTasksCount || 0}</Text>
							<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.overdueTasks")}</Text>
						</View>

						<View style={[styles.statDivider, { backgroundColor: colors.border }]} />

						<View style={styles.statItem}>
							<Ionicons name="cart-outline" size={24} color={colors.warning} />
							<Text style={[styles.statValue, { color: colors.text }]}>{stats.customersBought30 || 0}</Text>
							<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.customersBought30")}</Text>
						</View>
					</View>
				</View>
			</View>
		);
	};

	// Tab: Settings
	const renderSettingsTab = () => {
		const themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
			{ value: "light", label: t("settings.themeLight"), icon: "sunny-outline" },
			{ value: "dark", label: t("settings.themeDark"), icon: "moon-outline" },
			{ value: "system", label: t("settings.themeSystem"), icon: "phone-portrait-outline" },
		];

		const languageOptions: { value: Language; label: string }[] = [
			{ value: "vi", label: "Tiếng Việt" },
			{ value: "en", label: "English" },
		];

		const reminderOptions = [
			{ value: 15, label: t("profile.minutes15") },
			{ value: 60, label: t("profile.hour1") },
			{ value: 1440, label: t("profile.day1") },
		];

		const workingDaysOptions = [
			{ value: "mon-fri", label: t("profile.monFri") },
			{ value: "mon-sat", label: t("profile.monSat") },
		];

		return (
			<View style={styles.tabContent}>
				{/* Experience Group */}
				<Text style={[styles.settingGroupTitle, { color: colors.textSecondary }]}>{t("profile.experienceGroup")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					{/* Notifications toggle */}
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Ionicons name="notifications-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.receiveNotifications")}</Text>
						</View>
						<Switch value={notificationsEnabled} onValueChange={handleNotificationToggle} trackColor={{ false: colors.border, true: colors.primary + "50" }} thumbColor={notificationsEnabled ? colors.primary : colors.textLight} disabled={saving} />
					</View>

					{/* Theme options */}
					<View style={[styles.settingRowBorder, { borderTopColor: colors.border }]}>
						<View style={[styles.settingInfo, { marginBottom: Spacing.sm }]}>
							<Ionicons name="contrast-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("profile.appearance")}</Text>
						</View>
						<View style={styles.optionsRow}>
							{themeOptions.map((option) => (
								<TouchableOpacity
									key={option.value}
									style={[
										styles.optionChip,
										{
											backgroundColor: theme === option.value ? colors.primary : colors.surface,
											borderColor: theme === option.value ? colors.primary : colors.border,
										},
									]}
									onPress={() => handleThemeChange(option.value)}
									disabled={saving}>
									<Ionicons name={option.icon as any} size={16} color={theme === option.value ? colors.white : colors.text} />
									<Text style={[styles.optionChipText, { color: theme === option.value ? colors.white : colors.text }]}>{option.label}</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Language options */}
					<View style={[styles.settingRowBorder, { borderTopColor: colors.border }]}>
						<View style={[styles.settingInfo, { marginBottom: Spacing.sm }]}>
							<Ionicons name="language-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.language")}</Text>
						</View>
						<View style={styles.optionsRow}>
							{languageOptions.map((option) => (
								<TouchableOpacity
									key={option.value}
									style={[
										styles.optionChip,
										{
											backgroundColor: language === option.value ? colors.primary : colors.surface,
											borderColor: language === option.value ? colors.primary : colors.border,
										},
									]}
									onPress={() => handleLanguageChange(option.value)}>
									<Text style={[styles.optionChipText, { color: language === option.value ? colors.white : colors.text }]}>{option.label}</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</View>

				{/* Work & Follow-up Group */}
				<Text style={[styles.settingGroupTitle, { color: colors.textSecondary }]}>{t("profile.workGroup")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					{/* Reminder before deadline */}
					<View style={styles.settingRowPadded}>
						<View style={[styles.settingInfo, { marginBottom: Spacing.sm }]}>
							<Ionicons name="alarm-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("profile.reminderBefore")}</Text>
						</View>
						<View style={styles.optionsRow}>
							{reminderOptions.map((option) => (
								<TouchableOpacity
									key={option.value}
									style={[
										styles.optionChip,
										{
											backgroundColor: reminderTime === option.value ? colors.primary : colors.surface,
											borderColor: reminderTime === option.value ? colors.primary : colors.border,
										},
									]}
									onPress={() => handleReminderChange(option.value)}
									disabled={saving}>
									<Text style={[styles.optionChipText, { color: reminderTime === option.value ? colors.white : colors.text }]}>{option.label}</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Working days */}
					<View style={[styles.settingRowBorder, { borderTopColor: colors.border }]}>
						<View style={[styles.settingInfo, { marginBottom: Spacing.sm }]}>
							<Ionicons name="calendar-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("profile.workingDays")}</Text>
						</View>
						<View style={styles.optionsRow}>
							{workingDaysOptions.map((option) => (
								<TouchableOpacity
									key={option.value}
									style={[
										styles.optionChip,
										{
											backgroundColor: workingDays === option.value ? colors.primary : colors.surface,
											borderColor: workingDays === option.value ? colors.primary : colors.border,
										},
									]}
									onPress={() => handleWorkingDaysChange(option.value)}
									disabled={saving}>
									<Text style={[styles.optionChipText, { color: workingDays === option.value ? colors.white : colors.text }]}>{option.label}</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Working hours (read-only display) */}
					<View style={[styles.settingRowBorder, { borderTopColor: colors.border }]}>
						<View style={styles.settingInfo}>
							<Ionicons name="time-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("profile.workingHours")}</Text>
						</View>
						<Text style={[styles.settingValue, { color: colors.textSecondary }]}>
							{workingHoursFrom} - {workingHoursTo}
						</Text>
					</View>
				</View>

				{/* Security Group */}
				<Text style={[styles.settingGroupTitle, { color: colors.textSecondary }]}>{t("profile.securityGroup")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<TouchableOpacity style={styles.settingRow} onPress={() => router.push("/change-password")}>
						<View style={styles.settingInfo}>
							<Ionicons name="lock-closed-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.changePassword")}</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color={colors.textLight} />
					</TouchableOpacity>
				</View>

				{/* System Info Group */}
				<Text style={[styles.settingGroupTitle, { color: colors.textSecondary }]}>{t("profile.systemGroup")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Ionicons name="information-circle-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.version")}</Text>
						</View>
						<Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
					</View>

					<View style={[styles.settingRow, styles.settingRowBorder, { borderTopColor: colors.border }]}>
						<View style={styles.settingInfo}>
							<Ionicons name="server-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("profile.environment")}</Text>
						</View>
						<Text style={[styles.settingValue, { color: colors.textSecondary }]}>Production</Text>
					</View>

					<View style={[styles.settingRow, styles.settingRowBorder, { borderTopColor: colors.border }]}>
						<View style={styles.settingInfo}>
							<Ionicons name="mail-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("profile.contactIT")}</Text>
						</View>
						<Text style={[styles.settingValue, { color: colors.textSecondary }]}>it@company.vn</Text>
					</View>
				</View>

				{/* Logout button */}
				<TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error + "10", borderColor: colors.error }]} onPress={handleLogout}>
					<Ionicons name="log-out-outline" size={22} color={colors.error} />
					<Text style={[styles.logoutText, { color: colors.error }]}>{t("auth.logout")}</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const tabs: { id: TabType; label: string; icon: string }[] = [
		{ id: "info", label: t("profile.tabInfo"), icon: "person-outline" },
		{ id: "performance", label: t("profile.tabPerformance"), icon: "stats-chart-outline" },
		{ id: "settings", label: t("profile.tabSettings"), icon: "settings-outline" },
	];

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Loading />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}>
				{/* Header with profile card */}
				<View style={[styles.header, { backgroundColor: colors.primary }]}>
					<View style={styles.profileHeader}>
						<View style={[styles.avatar, { backgroundColor: colors.white }]}>
							<Text style={[styles.avatarText, { color: colors.primary }]}>{user?.name?.charAt(0).toUpperCase() || "U"}</Text>
						</View>
						<View style={styles.profileInfo}>
							<Text style={[styles.userName, { color: colors.white }]}>{user?.name || t("profile.user")}</Text>
							<View style={[styles.roleBadge, { backgroundColor: colors.white + "20" }]}>
								<Text style={[styles.roleText, { color: colors.white }]}>{getRoleLabel()}</Text>
							</View>
							<Text style={[styles.userEmail, { color: colors.white + "90" }]}>{user?.email || ""}</Text>
						</View>
					</View>
				</View>

				{/* Summary Cards */}
				{renderSummaryCards()}

				{/* Tabs */}
				<View style={styles.tabContainer}>
					{tabs.map((tab) => (
						<TouchableOpacity
							key={tab.id}
							style={[
								styles.tab,
								{
									backgroundColor: activeTab === tab.id ? colors.primary : colors.surface,
									borderColor: activeTab === tab.id ? colors.primary : colors.border,
								},
							]}
							onPress={() => setActiveTab(tab.id)}>
							<Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? colors.white : colors.text} />
							<Text style={[styles.tabText, { color: activeTab === tab.id ? colors.white : colors.text }]}>{tab.label}</Text>
						</TouchableOpacity>
					))}
				</View>

				{/* Tab content */}
				{activeTab === "info" && renderInfoTab()}
				{activeTab === "performance" && renderPerformanceTab()}
				{activeTab === "settings" && renderSettingsTab()}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingTop: Spacing.md,
		paddingBottom: Spacing.xl + 30,
		paddingHorizontal: Spacing.lg,
		borderBottomLeftRadius: 30,
		borderBottomRightRadius: 30,
	},
	profileHeader: {
		flexDirection: "row",
		alignItems: "center",
	},
	avatar: {
		width: 70,
		height: 70,
		borderRadius: 35,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	avatarText: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
	},
	profileInfo: {
		flex: 1,
	},
	userName: {
		fontSize: FontSize.xl,
		fontWeight: "bold",
		marginBottom: 4,
	},
	roleBadge: {
		alignSelf: "flex-start",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs,
		borderRadius: BorderRadius.full,
		marginBottom: 4,
	},
	roleText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	userEmail: {
		fontSize: FontSize.sm,
	},
	// Summary cards
	summaryContainer: {
		flexDirection: "row",
		marginHorizontal: Spacing.lg,
		marginTop: -30,
		gap: Spacing.sm,
	},
	summaryCard: {
		flex: 1,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		alignItems: "center",
	},
	summaryIconBox: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.xs,
	},
	summaryValue: {
		fontSize: FontSize.xl,
		fontWeight: "bold",
	},
	summaryLabel: {
		fontSize: FontSize.xs,
		textAlign: "center",
		marginTop: 2,
	},
	// Tabs
	tabContainer: {
		flexDirection: "row",
		marginHorizontal: Spacing.lg,
		marginTop: Spacing.lg,
		marginBottom: Spacing.md,
		gap: Spacing.sm,
	},
	tab: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		gap: 6,
	},
	tabText: {
		fontSize: FontSize.sm,
		fontWeight: "600",
	},
	tabContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	// Info tab
	infoCard: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: Spacing.sm,
	},
	infoRowBorder: {
		borderTopWidth: 1,
	},
	infoLabel: {
		fontSize: FontSize.sm,
	},
	infoValue: {
		fontSize: FontSize.sm,
		fontWeight: "600",
		textAlign: "right",
		flex: 1,
		marginLeft: Spacing.md,
	},
	infoNote: {
		fontSize: FontSize.xs,
		textAlign: "center",
		marginTop: Spacing.md,
		fontStyle: "italic",
	},
	// Performance tab
	statsCard: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.lg,
		marginBottom: Spacing.md,
	},
	statsRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	statItem: {
		flex: 1,
		alignItems: "center",
	},
	statDivider: {
		width: 1,
		height: 60,
		marginHorizontal: Spacing.md,
	},
	statValue: {
		fontSize: FontSize.xl,
		fontWeight: "bold",
		marginTop: Spacing.sm,
	},
	statLabel: {
		fontSize: FontSize.xs,
		textAlign: "center",
		marginTop: 4,
	},
	// Settings tab
	settingGroupTitle: {
		fontSize: FontSize.xs,
		fontWeight: "600",
		textTransform: "uppercase",
		marginTop: Spacing.lg,
		marginBottom: Spacing.sm,
		marginLeft: Spacing.sm,
	},
	settingCard: {
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		padding: Spacing.md,
	},
	settingRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: Spacing.sm,
	},
	settingRowPadded: {
		paddingVertical: Spacing.sm,
	},
	settingRowBorder: {
		paddingVertical: Spacing.md,
		borderTopWidth: 1,
	},
	settingInfo: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	settingLabel: {
		fontSize: FontSize.base,
	},
	settingValue: {
		fontSize: FontSize.sm,
	},
	optionsRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
		marginTop: Spacing.xs,
	},
	optionChip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.full,
		borderWidth: 1,
		gap: 6,
	},
	optionChipText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	logoutButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		marginTop: Spacing.xl,
		gap: Spacing.sm,
	},
	logoutText: {
		fontSize: FontSize.base,
		fontWeight: "600",
	},
});
