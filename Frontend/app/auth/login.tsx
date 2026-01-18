import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, TextInput } from "@/components/ui";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

export default function LoginScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { login } = useAuth();
	const { t } = useTranslation();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

	const validate = () => {
		const newErrors: { email?: string; password?: string } = {};

		if (!email.trim()) {
			newErrors.email = t("auth.enterEmail");
		} else if (!/\S+@\S+\.\S+/.test(email)) {
			newErrors.email = t("auth.invalidEmail");
		}

		if (!password) {
			newErrors.password = t("auth.enterPassword");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleLogin = async () => {
		if (!validate()) return;

		setLoading(true);
		try {
			await login(email, password);
			router.replace("/(tabs)");
		} catch (error: any) {
			Alert.alert(t("auth.loginFailed"), error.message || t("auth.invalidCredentials"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
				<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
					{/* Header*/}
					<View style={[styles.illustrationContainer, { backgroundColor: colors.secondary }]}>
						<Ionicons name="bar-chart-outline" size={80} color={colors.primary} />
						<Ionicons name="checkmark-circle" size={30} color={colors.info} style={styles.checkIcon} />
					</View>

					{/* Title */}
					<Text style={[styles.title, { color: colors.primary }]}>{t("auth.loginTitle")}</Text>

					{/* Form */}
					<View style={styles.form}>
						<TextInput label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} leftIcon="mail-outline" />

						<TextInput label={t("auth.password")} placeholder={t("auth.passwordPlaceholder")} value={password} onChangeText={setPassword} secureTextEntry error={errors.password} leftIcon="lock-closed-outline" />

						<Button title={t("auth.login")} onPress={handleLogin} loading={loading} style={styles.loginButton} icon={<Ionicons name="arrow-forward" size={20} color={colors.white} />} />

						{/* <TouchableOpacity onPress={() => router.push("/auth/forgot-password")} style={styles.forgotButton}>
							<Text style={[styles.forgotText, { color: colors.primary }]}>{t("auth.forgotPassword")}</Text>
						</TouchableOpacity> */}
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
		paddingTop: Spacing.xl,
	},
	illustrationContainer: {
		height: 200,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.xl,
		position: "relative",
	},
	checkIcon: {
		position: "absolute",
		top: 20,
		right: 30,
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: Spacing.xl,
	},
	form: {
		width: "100%",
	},
	loginButton: {
		marginTop: Spacing.md,
		flexDirection: "row-reverse",
	},
	forgotButton: {
		alignSelf: "center",
		marginTop: Spacing.lg,
		padding: Spacing.sm,
	},
	forgotText: {
		fontSize: FontSize.base,
		fontWeight: "500",
	},
});
