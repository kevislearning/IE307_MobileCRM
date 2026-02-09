import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Loading } from "@/components/ui";
import { Language, languages } from "@/i18n";

type ThemeOption = "light" | "dark" | "system";

export default function SettingsScreen() {
	const { theme, colorScheme, setTheme } = useTheme();
	const colors = Colors[colorScheme];
	const { user } = useAuth();
	const { language, setLanguage, t } = useLanguage();

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchSettings();
	}, []);

	const fetchSettings = async () => {
		try {
			setLoading(true);
			const response = await api.getSettings();
			const settings = (response as any).data;
			setNotificationsEnabled(settings.notifications_enabled ?? true);
			// Đồng bộ theme từ backend nếu khác
			if (settings.theme && settings.theme !== theme) {
				await setTheme(settings.theme);
			}
		} catch (error) {
			console.error("Error fetching settings:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleNotificationToggle = async (value: boolean) => {
		setNotificationsEnabled(value);
		setSaving(true);
		try {
			await api.updateSettings({ notifications_enabled: value });
		} catch (error: any) {
			setNotificationsEnabled(!value);
			Alert.alert(t("common.error"), error.message || t("settings.cannotUpdateSettings"));
		} finally {
			setSaving(false);
		}
	};

	const handleThemeChange = async (newTheme: ThemeOption) => {
		const oldTheme = theme;
		setSaving(true);
		try {
			// Cập nhật theme cục bộ ngay lập tức để phản hồi nhanh
			await setTheme(newTheme);
			// Đồng bộ với backend
			await api.updateSettings({ theme: newTheme });
		} catch (error: any) {
			// Hoàn tác nếu có lỗi
			await setTheme(oldTheme);
			Alert.alert(t("common.error"), error.message || t("settings.cannotUpdateTheme"));
		} finally {
			setSaving(false);
		}
	};

	const handleLanguageChange = async (newLanguage: Language) => {
		await setLanguage(newLanguage);
	};

	const themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
		{ value: "light", label: t("settings.themeLight"), icon: "sunny-outline" },
		{ value: "dark", label: t("settings.themeDark"), icon: "moon-outline" },
		{ value: "system", label: t("settings.themeSystem"), icon: "phone-portrait-outline" },
	];

	const languageOptions: { value: Language; label: string; icon: string }[] = [
		{ value: "vi", label: "Tiếng Việt", icon: "language-outline" },
		{ value: "en", label: "English", icon: "language-outline" },
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
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text }]}>{t("settings.title")}</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content}>
				{/* Notifications section */}
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.notifications")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Ionicons name="notifications-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.receiveNotifications")}</Text>
						</View>
						<Switch value={notificationsEnabled} onValueChange={handleNotificationToggle} trackColor={{ false: colors.border, true: colors.primary + "50" }} thumbColor={notificationsEnabled ? colors.primary : colors.textLight} disabled={saving} />
					</View>
				</View>

				{/* Appearance section */}
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.appearance")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					{themeOptions.map((option, index) => (
						<TouchableOpacity key={option.value} style={[styles.settingRow, index < themeOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => handleThemeChange(option.value)} disabled={saving}>
							<View style={styles.settingInfo}>
								<Ionicons name={option.icon as any} size={22} color={colors.text} />
								<Text style={[styles.settingLabel, { color: colors.text }]}>{option.label}</Text>
							</View>
							{theme === option.value && <Ionicons name="checkmark" size={22} color={colors.primary} />}
						</TouchableOpacity>
					))}
				</View>

				{/* Language section */}
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.language")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					{languageOptions.map((option, index) => (
						<TouchableOpacity key={option.value} style={[styles.settingRow, index < languageOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => handleLanguageChange(option.value)}>
							<View style={styles.settingInfo}>
								<Ionicons name={option.icon as any} size={22} color={colors.text} />
								<Text style={[styles.settingLabel, { color: colors.text }]}>{option.label}</Text>
							</View>
							{language === option.value && <Ionicons name="checkmark" size={22} color={colors.primary} />}
						</TouchableOpacity>
					))}
				</View>

				{/* Account section */}
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.account")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<TouchableOpacity style={styles.settingRow} onPress={() => router.push("/change-password")}>
						<View style={styles.settingInfo}>
							<Ionicons name="lock-closed-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.changePassword")}</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color={colors.textLight} />
					</TouchableOpacity>
				</View>

				{/* About section */}
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.info")}</Text>
				<View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Ionicons name="information-circle-outline" size={22} color={colors.text} />
							<Text style={[styles.settingLabel, { color: colors.text }]}>{t("settings.version")}</Text>
						</View>
						<Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
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
	sectionTitle: {
		fontSize: FontSize.xs,
		fontWeight: "600",
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.lg,
		paddingBottom: Spacing.sm,
		letterSpacing: 0.5,
	},
	settingCard: {
		marginHorizontal: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	settingRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.lg,
	},
	settingInfo: {
		flexDirection: "row",
		alignItems: "center",
	},
	settingLabel: {
		fontSize: FontSize.base,
		marginLeft: Spacing.md,
	},
	settingValue: {
		fontSize: FontSize.sm,
	},
});
