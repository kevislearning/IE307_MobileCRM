import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { Task } from "@/types";
import { Loading, Badge, Button, TextInput } from "@/components/ui";

export default function TaskDetailScreen() {
	const { id } = useLocalSearchParams();
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { user, isManager } = useAuth();
	const { t } = useTranslation();

	const [task, setTask] = useState<Task | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [completing, setCompleting] = useState(false);
	const [newSubtask, setNewSubtask] = useState("");

	const fetchTaskDetails = async (isRefresh = false) => {
		try {
			if (!isRefresh) setLoading(true);
			const response = await api.getTask(Number(id));
			setTask((response as any).data);
		} catch (error) {
			console.error("Error fetching task:", error);
			Alert.alert(t("common.error"), t("tasks.cannotLoadTask"));
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			fetchTaskDetails();
		}, [id]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchTaskDetails(true);
	};

	const handleComplete = async () => {
		if (!task || task.status === "DONE") return;

		Alert.alert(t("tasks.completeTask"), t("tasks.completeConfirm"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("tasks.markComplete"),
				onPress: async () => {
					setCompleting(true);
					try {
						await api.completeTask(Number(id));
						setTask((prev) => (prev ? { ...prev, status: "DONE", completed_at: new Date().toISOString() } : null));
						Alert.alert(t("common.success"), t("tasks.taskCompleted"));
					} catch (error: any) {
						Alert.alert(t("common.error"), error.message || t("tasks.cannotComplete"));
					} finally {
						setCompleting(false);
					}
				},
			},
		]);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("vi-VN", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("vi-VN", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getTaskStatus = () => {
		if (!task) return { label: "", color: colors.textSecondary };
		if (task.status === "DONE") return { label: t("tasks.completed"), color: colors.success };

		const dueDate = new Date(task.due_date);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		dueDate.setHours(0, 0, 0, 0);

		if (dueDate < today) return { label: t("tasks.overdue"), color: colors.error };
		if (dueDate.getTime() === today.getTime()) return { label: t("tasks.today"), color: colors.warning };
		return { label: t("tasks.upcoming"), color: colors.info };
	};

	if (loading) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Loading />
			</SafeAreaView>
		);
	}

	if (!task) {
		return (
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.errorText, { color: colors.error }]}>{t("tasks.taskNotFound")}</Text>
			</SafeAreaView>
		);
	}

	const status = getTaskStatus();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text style={[styles.headerTitle, { color: colors.text }]}>{t("tasks.taskDetail")}</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}>
				{/* Task header card */}
				<View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.taskHeader}>
						<View style={[styles.statusIcon, { backgroundColor: task.status === "DONE" ? colors.success + "20" : colors.warning + "20" }]}>
							<Ionicons name={task.status === "DONE" ? "checkmark-circle" : "time"} size={32} color={task.status === "DONE" ? colors.success : colors.warning} />
						</View>
						<Badge label={status.label} color={status.color} />
					</View>

					<Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>

					{task.description && <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>{task.description}</Text>}

					{(task.tags || []).length > 0 && (
						<View style={styles.tagRow}>
							{task.tags?.map((tag) => (
								<Badge key={tag.id} text={tag.name} />
							))}
						</View>
					)}
				</View>

				{/* Details */}
				<View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.detailRow}>
						<View style={styles.detailIcon}>
							<Ionicons name="calendar-outline" size={20} color={colors.primary} />
						</View>
						<View style={styles.detailContent}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("tasks.dueDate")}</Text>
							<Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(task.due_date)}</Text>
						</View>
					</View>

					{task.lead && (
						<TouchableOpacity style={styles.detailRow} onPress={() => router.push(`/lead/${task.lead?.id}`)}>
							<View style={styles.detailIcon}>
								<Ionicons name="person-outline" size={20} color={colors.primary} />
							</View>
							<View style={styles.detailContent}>
								<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("tasks.relatedCustomer")}</Text>
								<Text style={[styles.detailValue, { color: colors.primary }]}>{task.lead.full_name}</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={colors.textLight} />
						</TouchableOpacity>
					)}

					{isManager && task.assigned_user && (
						<View style={styles.detailRow}>
							<View style={styles.detailIcon}>
								<Ionicons name="briefcase-outline" size={20} color={colors.primary} />
							</View>
							<View style={styles.detailContent}>
								<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("tasks.assignedTo")}</Text>
								<Text style={[styles.detailValue, { color: colors.text }]}>{task.assigned_user.name}</Text>
							</View>
						</View>
					)}

					<View style={styles.detailRow}>
						<View style={styles.detailIcon}>
							<Ionicons name="time-outline" size={20} color={colors.primary} />
						</View>
						<View style={styles.detailContent}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("tasks.createdAt")}</Text>
							<Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(task.created_at)}</Text>
						</View>
					</View>

					{task.completed_at && (
						<View style={styles.detailRow}>
							<View style={styles.detailIcon}>
								<Ionicons name="checkmark-done-outline" size={20} color={colors.success} />
							</View>
							<View style={styles.detailContent}>
								<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t("tasks.completedAt")}</Text>
								<Text style={[styles.detailValue, { color: colors.success }]}>{formatDateTime(task.completed_at)}</Text>
							</View>
						</View>
					)}
				</View>

				{/* Notes */}
				{task.notes && (
					<View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.notesTitle, { color: colors.text }]}>{t("notes.addNote")}</Text>
						<Text style={[styles.notesContent, { color: colors.textSecondary }]}>{task.notes}</Text>
					</View>
				)}

				{/* Subtasks */}
				<View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.notesTitle, { color: colors.text }]}>{t("tasks.subtasks")}</Text>
					{(task.subtasks || []).map((subtask) => (
						<TouchableOpacity
							key={subtask.id}
							style={styles.subtaskRow}
							onPress={async () => {
								await api.updateTaskSubtask(subtask.id, { is_done: !subtask.is_done });
								fetchTaskDetails(true);
							}}>
							<Ionicons name={subtask.is_done ? "checkbox" : "square-outline"} size={20} color={subtask.is_done ? colors.success : colors.textLight} />
							<Text style={[styles.subtaskText, { color: colors.text }, subtask.is_done && styles.taskCompleted]}>{subtask.title}</Text>
						</TouchableOpacity>
					))}
					<View style={styles.subtaskInput}>
						<TextInput placeholder={t("tasks.addSubtask")} value={newSubtask} onChangeText={setNewSubtask} />
						<Button
							title={t("common.add")}
							size="sm"
							onPress={async () => {
								if (!newSubtask.trim()) return;
								await api.createTaskSubtask(task.id, newSubtask.trim());
								setNewSubtask("");
								fetchTaskDetails(true);
							}}
						/>
					</View>
				</View>

				{/* History */}
				{(task.history || []).length > 0 && (
					<View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.notesTitle, { color: colors.text }]}>{t("tasks.history")}</Text>
						{task.history?.map((item) => (
							<View key={item.id} style={styles.historyRow}>
								<Text style={[styles.historyText, { color: colors.text }]}>{item.action}</Text>
								<Text style={[styles.historyTime, { color: colors.textLight }]}>{item.created_at ? formatDateTime(item.created_at) : ""}</Text>
							</View>
						))}
					</View>
				)}

				{/* Complete button - Only show for assigned user */}
				{task.status !== "DONE" && task.assigned_to === user?.id && (
					<View style={styles.actionContainer}>
						<Button title={t("tasks.markComplete")} onPress={handleComplete} loading={completing} icon={<Ionicons name="checkmark-circle" size={20} color={colors.white} />} />
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	headerTitle: {
		fontSize: FontSize.lg,
		fontWeight: "600",
	},
	content: {
		flex: 1,
	},
	taskCard: {
		margin: Spacing.lg,
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	taskHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: Spacing.md,
	},
	statusIcon: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
	},
	taskTitle: {
		fontSize: FontSize.xl,
		fontWeight: "600",
		marginBottom: Spacing.sm,
	},
	taskDescription: {
		fontSize: FontSize.base,
		lineHeight: 22,
	},
	tagRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: Spacing.sm,
		marginTop: Spacing.sm,
	},
	detailsCard: {
		marginHorizontal: Spacing.lg,
		padding: Spacing.md,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	detailRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: Spacing.md,
	},
	detailIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#F3F4F6",
		marginRight: Spacing.md,
	},
	detailContent: {
		flex: 1,
	},
	detailLabel: {
		fontSize: FontSize.sm,
		marginBottom: 2,
	},
	detailValue: {
		fontSize: FontSize.base,
		fontWeight: "500",
	},
	notesCard: {
		margin: Spacing.lg,
		padding: Spacing.lg,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
	},
	notesTitle: {
		fontSize: FontSize.md,
		fontWeight: "600",
		marginBottom: Spacing.sm,
	},
	notesContent: {
		fontSize: FontSize.base,
		lineHeight: 22,
	},
	subtaskRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: Spacing.sm,
		gap: Spacing.sm,
	},
	subtaskText: {
		fontSize: FontSize.base,
	},
	subtaskInput: {
		marginTop: Spacing.sm,
	},
	historyRow: {
		marginBottom: Spacing.sm,
	},
	historyText: {
		fontSize: FontSize.sm,
	},
	historyTime: {
		fontSize: FontSize.xs,
	},
	actionContainer: {
		padding: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	errorText: {
		textAlign: "center",
		fontSize: FontSize.md,
		marginTop: Spacing.xl,
	},
});
