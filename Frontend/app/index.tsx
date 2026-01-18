import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function IndexScreen() {
	const { isAuthenticated, isLoading } = useAuth();
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];

	useEffect(() => {
		if (!isLoading) {
			if (isAuthenticated) {
				router.replace("/(tabs)");
			} else {
				router.replace("/auth/welcome");
			}
		}
	}, [isAuthenticated, isLoading]);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ActivityIndicator size="large" color={colors.primary} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
});
