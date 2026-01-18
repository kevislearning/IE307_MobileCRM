import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect } from "react";
import { AppState } from "react-native";
// expo-notifications temporarily disabled
// import * as Notifications from "expo-notifications";

import { ThemeProvider, useAppColorScheme } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { initNotifications, syncSmartReminders } from "@/services/notifications";

// Custom themes based on our color palette
const CRMDarkTheme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		primary: Colors.dark.primary,
		background: Colors.dark.background,
		card: Colors.dark.card,
		text: Colors.dark.text,
		border: Colors.dark.border,
	},
};

const CRMLightTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		primary: Colors.light.primary,
		background: Colors.light.background,
		card: Colors.light.card,
		text: Colors.light.text,
		border: Colors.light.border,
	},
};

function AppContent() {
	const colorScheme = useAppColorScheme();
	const router = useRouter();
	const { isAuthenticated, user } = useAuth();

	useEffect(() => {
		if (!isAuthenticated || user?.notifications_enabled === false) return;
		initNotifications().then((result) => {
			if (result.granted) {
				syncSmartReminders();
			}
		});
	}, [isAuthenticated, user?.notifications_enabled]);

	useEffect(() => {
		if (!isAuthenticated || user?.notifications_enabled === false) return;
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				syncSmartReminders();
			}
		});
		return () => subscription.remove();
	}, [isAuthenticated, user?.notifications_enabled]);

	// expo-notifications temporarily disabled
	// useEffect(() => {
	// 	const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
	// 		const data: any = response.notification.request.content.data || {};
	// 		if (data.taskId) {
	// 			router.push(`/task/${data.taskId}`);
	// 			return;
	// 		}
	// 		if (data.leadId) {
	// 			router.push(`/lead/${data.leadId}`);
	// 			return;
	// 		}
	// 		router.push("/(tabs)/notifications");
	// 	});
	// 	return () => responseSubscription.remove();
	// }, [router]);

	return (
		<NavigationThemeProvider value={colorScheme === "dark" ? CRMDarkTheme : CRMLightTheme}>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="auth" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
				<Stack.Screen name="lead/[id]" options={{ presentation: "card" }} />
				<Stack.Screen name="task/[id]" options={{ presentation: "card" }} />
				<Stack.Screen name="opportunity/[id]" options={{ presentation: "card" }} />
				<Stack.Screen name="settings" options={{ presentation: "card" }} />
				<Stack.Screen name="change-password" options={{ presentation: "card" }} />
			</Stack>
			<StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
		</NavigationThemeProvider>
	);
}

export default function RootLayout() {
	return (
		<ThemeProvider>
			<LanguageProvider>
				<AuthProvider>
					<AppContent />
				</AuthProvider>
			</LanguageProvider>
		</ThemeProvider>
	);
}
