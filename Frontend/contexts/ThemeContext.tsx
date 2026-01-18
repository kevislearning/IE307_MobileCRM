import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { storage } from "@/services/storage";

type ThemeOption = "light" | "dark" | "system";
type ColorScheme = "light" | "dark";

interface ThemeContextType {
	theme: ThemeOption;
	colorScheme: ColorScheme;
	setTheme: (theme: ThemeOption) => Promise<void>;
	isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "app_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
	const systemColorScheme = useSystemColorScheme();
	const [theme, setThemeState] = useState<ThemeOption>("system");
	const [isLoading, setIsLoading] = useState(true);

	// Calculate actual color scheme based on theme preference
	const colorScheme: ColorScheme = theme === "system" ? systemColorScheme ?? "light" : theme;

	// Load theme from storage on mount
	useEffect(() => {
		loadTheme();
	}, []);

	const loadTheme = async () => {
		try {
			const savedTheme = await storage.get(THEME_STORAGE_KEY);
			if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
				setThemeState(savedTheme as ThemeOption);
			}
		} catch (error) {
			console.error("Error loading theme:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const setTheme = async (newTheme: ThemeOption) => {
		try {
			setThemeState(newTheme);
			await storage.set(THEME_STORAGE_KEY, newTheme);
		} catch (error) {
			console.error("Error saving theme:", error);
		}
	};

	return <ThemeContext.Provider value={{ theme, colorScheme, setTheme, isLoading }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}

// Custom hook that returns the current color scheme based on user preference
export function useAppColorScheme(): ColorScheme {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		// Fallback to system color scheme if not in provider
		const systemColorScheme = useSystemColorScheme();
		return systemColorScheme ?? "light";
	}
	return context.colorScheme;
}
