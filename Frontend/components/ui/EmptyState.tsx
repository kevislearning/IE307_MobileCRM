import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface EmptyStateProps {
	icon?: keyof typeof Ionicons.glyphMap;
	title: string;
	message?: string;
	actionLabel?: string;
	onAction?: () => void;
}

export function EmptyState({ icon = "document-outline", title, message, actionLabel, onAction }: EmptyStateProps) {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];

	return (
		<View style={styles.container}>
			<Ionicons name={icon} size={64} color={colors.textLight} />
			<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
			{message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
			{actionLabel && onAction && (
				<TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onAction}>
					<Text style={[styles.buttonText, { color: colors.white }]}>{actionLabel}</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: Spacing.xl,
	},
	title: {
		fontSize: FontSize.lg,
		fontWeight: "600",
		marginTop: Spacing.md,
		textAlign: "center",
	},
	message: {
		fontSize: FontSize.base,
		marginTop: Spacing.sm,
		textAlign: "center",
	},
	button: {
		marginTop: Spacing.lg,
		paddingVertical: Spacing.md,
		paddingHorizontal: Spacing.xl,
		borderRadius: 8,
	},
	buttonText: {
		fontSize: FontSize.md,
		fontWeight: "600",
	},
});
