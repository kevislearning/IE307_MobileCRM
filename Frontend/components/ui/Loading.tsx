import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface LoadingProps {
	fullScreen?: boolean;
	size?: "small" | "large";
}

export function Loading({ fullScreen = false, size = "large" }: LoadingProps) {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];

	if (fullScreen) {
		return (
			<View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
				<ActivityIndicator size={size} color={colors.primary} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ActivityIndicator size={size} color={colors.primary} />
		</View>
	);
}

const styles = StyleSheet.create({
	fullScreen: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	container: {
		padding: 20,
		justifyContent: "center",
		alignItems: "center",
	},
});
