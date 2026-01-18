import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/LanguageContext";
import { LeadStatus } from "@/types";

export interface BadgeProps {
	text?: string;
	label?: string;
	variant?: "default" | "success" | "warning" | "error" | "info";
	size?: "small" | "medium" | "sm";
	color?: string;
	style?: ViewStyle;
	textStyle?: TextStyle;
}

export function Badge({ text, label, variant = "default", size = "small", color, style, textStyle }: BadgeProps) {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const displayText = label || text || "";
	const actualSize = size === "sm" ? "small" : size;

	const getBackgroundColor = () => {
		if (color) return color + "20";
		switch (variant) {
			case "success":
				return colors.success + "20";
			case "warning":
				return colors.warning + "20";
			case "error":
				return colors.error + "20";
			case "info":
				return colors.info + "20";
			default:
				return colors.border;
		}
	};

	const getTextColor = () => {
		if (color) return color;
		switch (variant) {
			case "success":
				return colors.success;
			case "warning":
				return colors.warning;
			case "error":
				return colors.error;
			case "info":
				return colors.info;
			default:
				return colors.textSecondary;
		}
	};

	return (
		<View
			style={[
				styles.badge,
				{
					backgroundColor: getBackgroundColor(),
					paddingVertical: actualSize === "small" ? 2 : 4,
					paddingHorizontal: actualSize === "small" ? 8 : 12,
				},
				style,
			]}>
			<Text
				style={[
					styles.text,
					{
						color: getTextColor(),
						fontSize: actualSize === "small" ? FontSize.xs : FontSize.sm,
					},
					textStyle,
				]}>
				{displayText}
			</Text>
		</View>
	);
}

interface StatusBadgeProps {
	status: LeadStatus;
	style?: ViewStyle;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
	const { t } = useTranslation();

	const getStatusLabel = (value: LeadStatus) => {
		switch (value) {
			case "LEAD":
				return t("customers.statusLead");
			case "CONTACTED":
				return t("customers.statusContacted");
			case "CARING":
				return t("customers.statusCaring");
			case "PURCHASED":
				return t("customers.statusPurchased");
			case "NO_NEED":
				return t("customers.statusNoNeed");
			default:
				return value;
		}
	};

	const getVariant = (): BadgeProps["variant"] => {
		switch (status) {
			case "PURCHASED":
				return "success";
			case "CARING":
				return "warning";
			case "NO_NEED":
				return "error";
			case "CONTACTED":
				return "info";
			default:
				return "default";
		}
	};

	return <Badge text={getStatusLabel(status)} variant={getVariant()} style={style} />;
}

const styles = StyleSheet.create({
	badge: {
		borderRadius: BorderRadius.full,
		alignSelf: "flex-start",
	},
	text: {
		fontWeight: "600",
	},
});
