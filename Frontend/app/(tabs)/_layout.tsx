import { Tabs } from "expo-router";
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

function QuickActionButton({ color }: { color: string }) {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];

	return (
		<View style={[styles.quickActionContainer, { backgroundColor: colors.primary }]}>
			<Ionicons name="add" size={24} color={colors.white} />
		</View>
	);
}

export default function TabLayout() {
	const colorScheme = useColorScheme();
	const { isSales, isManager } = useAuth();
	const { t } = useLanguage();
	const colors = Colors[colorScheme ?? "light"];

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textLight,
				headerShown: false,
				tabBarButton: HapticTab,
				tabBarStyle: {
					backgroundColor: colors.background,
					borderTopColor: colors.border,
					height: 65,
					paddingBottom: 10,
					paddingTop: 5,
				},
				tabBarLabelStyle: {
					fontSize: 10,
					fontWeight: "500",
				},
				tabBarIconStyle: {
					marginBottom: 2,
				},
			}}>
			<Tabs.Screen
				name="index"
				options={{
					title: t("tabs.customers"),
					tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="dashboard"
				options={{
					title: t("tabs.dashboard"),
					tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />,
					href: isManager ? "/dashboard" : null,
				}}
			/>
			<Tabs.Screen
				name="tasks"
				options={{
					title: t("tabs.tasks"),
					tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "checkbox" : "checkbox-outline"} size={22} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="opportunities"
				options={{
					title: t("tabs.opportunities"),
					tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={22} color={color} />,
					href: isManager ? "/opportunities" : null,
				}}
			/>
			{/* Quick Action tab - Only visible for Sales */}
			<Tabs.Screen
				name="quick-action"
				options={{
					title: "",
					tabBarIcon: ({ color }) => <QuickActionButton color={color} />,
					href: isSales ? "/quick-action" : null,
					tabBarIconStyle: { marginTop: -5 },
				}}
			/>
			<Tabs.Screen
				name="notifications"
				options={{
					title: t("tabs.notifications"),
					tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "notifications" : "notifications-outline"} size={22} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: t("tabs.profile"),
					tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />,
				}}
			/>
			{/* Hidden screens for navigation */}
			<Tabs.Screen
				name="explore"
				options={{
					href: null, // Hide from tab bar
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	quickActionContainer: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		marginTop: -10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 4,
	},
});
