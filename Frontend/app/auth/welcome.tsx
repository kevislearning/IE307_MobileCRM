import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "@/components/ui";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { t } = useTranslation();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={styles.content}>
				{/* Logo */}
				<View style={styles.logoContainer}>
					<View style={[styles.logoCircle, { borderColor: colors.primary }]}>
						<Text style={[styles.logoText, { color: colors.primary }]}>C</Text>
						<View style={[styles.logoAccent, { backgroundColor: colors.primary }]} />
					</View>
				</View>

				{/* Title */}
				<Text style={[styles.title, { color: colors.primary }]}>{t("auth.welcome")}</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t("auth.welcomeSubtitle")}</Text>

				{/* Illustration placeholder */}
				<View style={[styles.illustrationContainer, { backgroundColor: colors.secondary }]}>
					<Ionicons name="people-outline" size={120} color={colors.primary} />
				</View>

				{/* Button */}
				<Button title={t("auth.getStarted")} onPress={() => router.push("/auth/login")} style={styles.button} icon={<Ionicons name="arrow-forward" size={20} color={colors.white} />} />
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.xl,
	},
	logoContainer: {
		marginBottom: Spacing.lg,
	},
	logoCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 3,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
	},
	logoText: {
		fontSize: 40,
		fontWeight: "bold",
	},
	logoAccent: {
		position: "absolute",
		top: 10,
		right: 10,
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: Spacing.sm,
	},
	subtitle: {
		fontSize: FontSize.md,
		textAlign: "center",
		lineHeight: 24,
		marginBottom: Spacing.xl,
	},
	illustrationContainer: {
		width: width - Spacing.xl * 2,
		height: 250,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: Spacing.xl,
	},
	button: {
		width: "70%",
		flexDirection: "row-reverse",
	},
});
