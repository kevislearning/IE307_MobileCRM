/**
 * Theme constants for Mobile CRM App
 */

import { Platform } from "react-native";

export const Colors = {
	light: {
		primary: "#1E3A5F", // Navy blue từ design
		primaryLight: "#2C4A6E",
		secondary: "#F5F7FA", // Light background
		background: "#FFFFFF",
		surface: "#F8FAFC",
		text: "#1E3A5F",
		textSecondary: "#6B7280",
		textLight: "#9CA3AF",
		border: "#E5E7EB",
		error: "#EF4444",
		success: "#10B981",
		warning: "#F59E0B",
		info: "#3B82F6",
		white: "#FFFFFF",
		black: "#000000",
		card: "#FFFFFF",
		inputBackground: "#F5F7FA",
		placeholder: "#9CA3AF",
		tint: "#1E3A5F",
		icon: "#687076",
		tabIconDefault: "#687076",
		tabIconSelected: "#1E3A5F",

		// Màu trạng thái
		statusLead: "#6B7280",
		statusContacted: "#3B82F6",
		statusCaring: "#F59E0B",
		statusPurchased: "#10B981",
		statusNoNeed: "#EF4444",
	},
	dark: {
		primary: "#3B82F6",
		primaryLight: "#60A5FA",
		secondary: "#1F2937",
		background: "#111827",
		surface: "#1F2937",
		text: "#F9FAFB",
		textSecondary: "#9CA3AF",
		textLight: "#6B7280",
		border: "#374151",
		error: "#EF4444",
		success: "#10B981",
		warning: "#F59E0B",
		info: "#3B82F6",
		white: "#FFFFFF",
		black: "#000000",
		card: "#1F2937",
		inputBackground: "#374151",
		placeholder: "#6B7280",
		tint: "#3B82F6",
		icon: "#9BA1A6",
		tabIconDefault: "#9BA1A6",
		tabIconSelected: "#3B82F6",

		// Màu trạng thái
		statusLead: "#9CA3AF",
		statusContacted: "#60A5FA",
		statusCaring: "#FBBF24",
		statusPurchased: "#34D399",
		statusNoNeed: "#F87171",
	},
};

export const Spacing = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
};

export const FontSize = {
	xs: 10,
	sm: 12,
	base: 14,
	md: 16,
	lg: 18,
	xl: 20,
	xxl: 24,
	xxxl: 32,
};

export const BorderRadius = {
	sm: 4,
	md: 8,
	lg: 12,
	xl: 16,
	full: 9999,
};

export const Fonts = Platform.select({
	ios: {
		/** iOS `UIFontDescriptorSystemDesignDefault` */
		sans: "system-ui",
		/** iOS `UIFontDescriptorSystemDesignSerif` */
		serif: "ui-serif",
		/** iOS `UIFontDescriptorSystemDesignRounded` */
		rounded: "ui-rounded",
		/** iOS `UIFontDescriptorSystemDesignMonospaced` */
		mono: "ui-monospace",
	},
	default: {
		sans: "normal",
		serif: "serif",
		rounded: "normal",
		mono: "monospace",
	},
	web: {
		sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
		serif: "Georgia, 'Times New Roman', serif",
		rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
		mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
	},
});
