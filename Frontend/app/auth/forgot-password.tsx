import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, TextInput } from "@/components/ui";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { t } = useTranslation();

	const [step, setStep] = useState<"email" | "otp" | "reset">("email");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [resetToken, setResetToken] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<any>({});

	const handleSendOtp = async () => {
		if (!email.trim()) {
			setErrors({ email: t("auth.enterEmail") });
			return;
		}

		setLoading(true);
		try {
			await api.sendOtp(email);
			Alert.alert(t("common.success"), t("auth.otpSent"));
			setStep("otp");
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("auth.cannotSendOtp"));
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async () => {
		const otpString = otp.join("");
		if (otpString.length !== 6) {
			Alert.alert(t("common.error"), t("auth.enterOtpFull"));
			return;
		}

		setLoading(true);
		try {
			const response = await api.verifyOtp(email, otpString);
			setResetToken((response as any).reset_token);
			setStep("reset");
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("auth.invalidOtp"));
		} finally {
			setLoading(false);
		}
	};

	const handleResetPassword = async () => {
		if (!newPassword || !confirmPassword) {
			setErrors({ password: t("auth.enterFullInfo") });
			return;
		}
		if (newPassword !== confirmPassword) {
			setErrors({ confirmPassword: t("auth.passwordMismatch") });
			return;
		}
		if (newPassword.length < 12) {
			setErrors({ password: t("auth.passwordTooShort") });
			return;
		}

		setLoading(true);
		try {
			await api.resetPassword(email, resetToken, newPassword, confirmPassword);
			Alert.alert(t("common.success"), t("auth.passwordResetSuccess"), [{ text: t("auth.login"), onPress: () => router.replace("/auth/login") }]);
		} catch (error: any) {
			Alert.alert(t("common.error"), error.message || t("auth.cannotResetPassword"));
		} finally {
			setLoading(false);
		}
	};

	const handleOtpChange = (value: string, index: number) => {
		const newOtp = [...otp];
		newOtp[index] = value;
		setOtp(newOtp);

		// Auto focus next input
		if (value && index < 5) {
			// Focus next input (would need refs in real implementation)
		}
	};

	const renderEmailStep = () => (
		<>
			<Text style={[styles.title, { color: colors.text }]}>{t("auth.forgotPasswordTitle")}</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("auth.forgotPasswordSubtitle")}</Text>
			<TextInput label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} leftIcon="mail-outline" />
			<Button title={t("auth.sendOtp")} onPress={handleSendOtp} loading={loading} style={styles.button} icon={<Ionicons name="arrow-forward" size={20} color={colors.white} />} />
		</>
	);

	const renderOtpStep = () => (
		<>
			<Text style={[styles.title, { color: colors.text }]}>{t("auth.forgotPasswordTitle")}</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("auth.enterOtp")}</Text>
			<View style={styles.otpContainer}>
				{otp.map((digit, index) => (
					<View
						key={index}
						style={[
							styles.otpInput,
							{
								borderColor: digit ? colors.primary : colors.border,
								backgroundColor: colors.inputBackground,
							},
						]}>
						<TextInput value={digit} onChangeText={(value) => handleOtpChange(value.slice(-1), index)} keyboardType="numeric" maxLength={1} style={styles.otpTextInput} containerStyle={styles.otpInputContainer} />
					</View>
				))}
			</View>
			<Button title={t("auth.recover")} onPress={handleVerifyOtp} loading={loading} style={styles.button} icon={<Ionicons name="arrow-forward" size={20} color={colors.white} />} />
		</>
	);

	const renderResetStep = () => (
		<>
			<Text style={[styles.title, { color: colors.text }]}>{t("auth.resetPassword")}</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("auth.resetPasswordSubtitle")}</Text>
			<TextInput label={t("auth.newPassword")} placeholder={t("auth.newPasswordPlaceholder")} value={newPassword} onChangeText={setNewPassword} secureTextEntry error={errors.password} leftIcon="lock-closed-outline" />
			<TextInput label={t("auth.confirmNewPassword")} placeholder={t("auth.confirmPasswordPlaceholder")} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry error={errors.confirmPassword} leftIcon="lock-closed-outline" />
			<Button title={t("common.confirm")} onPress={handleResetPassword} loading={loading} style={styles.button} />
		</>
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
				<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
					{/* Back button */}
					<TouchableOpacity
						onPress={() => {
							if (step === "email") {
								router.back();
							} else if (step === "otp") {
								setStep("email");
							} else {
								setStep("otp");
							}
						}}
						style={[styles.backButton, { borderColor: colors.border }]}>
						<Ionicons name="chevron-back" size={24} color={colors.text} />
					</TouchableOpacity>

					<View style={styles.content}>
						{step === "email" && renderEmailStep()}
						{step === "otp" && renderOtpStep()}
						{step === "reset" && renderResetStep()}
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
	keyboardView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: Spacing.xl,
		paddingTop: Spacing.lg,
	},
	backButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		borderWidth: 1,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.lg,
	},
	content: {
		flex: 1,
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
		marginBottom: Spacing.sm,
	},
	subtitle: {
		fontSize: FontSize.base,
		lineHeight: 22,
		marginBottom: Spacing.xl,
	},
	otpContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: Spacing.xl,
	},
	otpInput: {
		width: 70,
		height: 70,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	otpInputContainer: {
		marginBottom: 0,
	},
	otpTextInput: {
		fontSize: FontSize.xxl,
		textAlign: "center",
	},
	button: {
		marginTop: Spacing.md,
		flexDirection: "row-reverse",
	},
});
