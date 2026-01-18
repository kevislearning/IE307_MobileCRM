import React, { useState } from "react";
import { View, TextInput as RNTextInput, Text, StyleSheet, TouchableOpacity, TextInputProps as RNTextInputProps, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface TextInputProps extends RNTextInputProps {
	label?: string;
	error?: string;
	containerStyle?: ViewStyle;
	leftIcon?: keyof typeof Ionicons.glyphMap;
	rightIcon?: keyof typeof Ionicons.glyphMap;
	onRightIconPress?: () => void;
}

export function TextInput({ label, error, containerStyle, leftIcon, rightIcon, onRightIconPress, secureTextEntry, ...props }: TextInputProps) {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const [isFocused, setIsFocused] = useState(false);
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

	const isPassword = secureTextEntry !== undefined;

	return (
		<View style={[styles.container, containerStyle]}>
			{label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
			<View
				style={[
					styles.inputContainer,
					{
						backgroundColor: colors.inputBackground,
						borderColor: error ? colors.error : isFocused ? colors.primary : colors.border,
					},
				]}>
				{leftIcon && <Ionicons name={leftIcon} size={20} color={colors.textLight} style={styles.leftIcon} />}
				<RNTextInput style={[styles.input, { color: colors.text }, leftIcon ? { paddingLeft: 0 } : {}]} placeholderTextColor={colors.placeholder} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} secureTextEntry={isPassword && !isPasswordVisible} {...props} />
				{isPassword && (
					<TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.rightIcon}>
						<Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textLight} />
					</TouchableOpacity>
				)}
				{rightIcon && !isPassword && (
					<TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
						<Ionicons name={rightIcon} size={20} color={colors.textLight} />
					</TouchableOpacity>
				)}
			</View>
			{error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: Spacing.md,
	},
	label: {
		fontSize: FontSize.base,
		fontWeight: "500",
		marginBottom: Spacing.sm,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: BorderRadius.lg,
		paddingHorizontal: Spacing.md,
	},
	input: {
		flex: 1,
		fontSize: FontSize.md,
		paddingVertical: Spacing.md,
	},
	leftIcon: {
		marginRight: Spacing.sm,
	},
	rightIcon: {
		padding: Spacing.xs,
	},
	error: {
		fontSize: FontSize.sm,
		marginTop: Spacing.xs,
	},
});
