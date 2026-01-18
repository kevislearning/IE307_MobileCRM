import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ButtonProps {
	title: string;
	onPress: () => void;
	variant?: "primary" | "secondary" | "outline" | "text";
	size?: "small" | "medium" | "large" | "sm";
	loading?: boolean;
	disabled?: boolean;
	style?: ViewStyle;
	textStyle?: TextStyle;
	icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = "primary", size = "medium", loading = false, disabled = false, style, textStyle, icon }: ButtonProps) {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const actualSize = size === "sm" ? "small" : size;

	const getBackgroundColor = () => {
		if (disabled) return colors.border;
		switch (variant) {
			case "primary":
				return colors.primary;
			case "secondary":
				return colors.secondary;
			case "outline":
			case "text":
				return "transparent";
			default:
				return colors.primary;
		}
	};

	const getTextColor = () => {
		if (disabled) return colors.textLight;
		switch (variant) {
			case "primary":
				return colors.white;
			case "secondary":
				return colors.primary;
			case "outline":
			case "text":
				return colors.primary;
			default:
				return colors.white;
		}
	};

	const getPadding = () => {
		switch (actualSize) {
			case "small":
				return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md };
			case "large":
				return { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl };
			default:
				return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg };
		}
	};

	const getFontSize = () => {
		switch (actualSize) {
			case "small":
				return FontSize.sm;
			case "large":
				return FontSize.lg;
			default:
				return FontSize.md;
		}
	};

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled || loading}
			style={[
				styles.button,
				getPadding(),
				{
					backgroundColor: getBackgroundColor(),
					borderColor: variant === "outline" ? colors.primary : "transparent",
					borderWidth: variant === "outline" ? 1 : 0,
				},
				style,
			]}
			activeOpacity={0.7}>
			{loading ? (
				<ActivityIndicator color={getTextColor()} size="small" />
			) : (
				<>
					{icon}
					<Text style={[styles.text, { color: getTextColor(), fontSize: getFontSize() }, icon ? { marginLeft: Spacing.sm } : {}, textStyle]}>{title}</Text>
				</>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: BorderRadius.lg,
	},
	text: {
		fontWeight: "600",
	},
});
