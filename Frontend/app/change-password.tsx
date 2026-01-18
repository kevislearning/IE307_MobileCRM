import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Button, TextInput } from "@/components/ui";

export default function ChangePasswordScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { t } = useTranslation();

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = () => {
		const newErrors: Record<string, string> = {};

		if (!currentPassword) {
			newErrors.currentPassword = t("changePassword.enterCurrentPassword");
		}
		if (!newPassword) {
			newErrors.newPassword = t("changePassword.enterNewPassword");
		} else if (newPassword.length < 12) {
			newErrors.newPassword = t("changePassword.passwordMinLength", { min: 12 });
		}
		if (!confirmPassword) {
			newErrors.confirmPassword = t("auth.enterFullInfo");
		} else if (newPassword !== confirmPassword) {
			newErrors.confirmPassword = t("auth.passwordMismatch");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleChangePassword = async () => {
		if (!validate()) return;

		setLoading(true);
		try {
			await api.changePassword({
				current_password: currentPassword,
				password: newPassword,
				password_confirmation: confirmPassword,
			});
			Alert.alert(t("common.success"), t("changePassword.passwordChanged"), [{ text: t("common.ok"), onPress: () => router.back() }]);
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("changePassword.cannotChangePassword"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text }]}>{t("changePassword.title")}</Text>
				<View style={{ width: 24 }} />
			</View>

			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					<View style={styles.form}>
						<TextInput label={t("changePassword.currentPassword")} placeholder={t("changePassword.currentPasswordPlaceholder")} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry error={errors.currentPassword} />

						<TextInput label={t("changePassword.newPassword")} placeholder={t("changePassword.newPasswordPlaceholder")} value={newPassword} onChangeText={setNewPassword} secureTextEntry error={errors.newPassword} />

						<TextInput label={t("changePassword.confirmPassword")} placeholder={t("changePassword.confirmPasswordPlaceholder")} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry error={errors.confirmPassword} />

						<View style={styles.hint}>
							<Ionicons name="information-circle-outline" size={16} color={colors.textLight} />
							<Text style={[styles.hintText, { color: colors.textLight }]}>{t("changePassword.passwordMinLength", { min: 12 })}</Text>
						</View>

						<Button title={t("changePassword.change")} onPress={handleChangePassword} loading={loading} style={styles.button} />
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
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
	scrollContent: {
		flexGrow: 1,
		padding: Spacing.lg,
	},
	form: {
		flex: 1,
	},
	hint: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: Spacing.md,
		marginBottom: Spacing.lg,
	},
	hintText: {
		fontSize: FontSize.sm,
		marginLeft: Spacing.xs,
	},
	button: {
		marginTop: Spacing.md,
	},
});
