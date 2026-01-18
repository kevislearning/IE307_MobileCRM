import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Animated, PanResponder, Dimensions, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { AppNotification, NotificationType } from "@/types";
import { Loading, EmptyState } from "@/components/ui";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 80;

// Notification icon configuration
const NOTIFICATION_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
	TASK_REMINDER: { icon: "alarm", color: "#F59E0B", bgColor: "#FEF3C7" },
	TASK_OVERDUE: { icon: "alert-circle", color: "#EF4444", bgColor: "#FEE2E2" },
	TASK_ASSIGNED: { icon: "checkbox", color: "#3B82F6", bgColor: "#DBEAFE" },
	LEAD_ASSIGNED: { icon: "person-add", color: "#8B5CF6", bgColor: "#EDE9FE" },
	NO_FOLLOW_UP: { icon: "time", color: "#F97316", bgColor: "#FFEDD5" },
	OPPORTUNITY_STAGE: { icon: "trending-up", color: "#06B6D4", bgColor: "#CFFAFE" },
	DEAL_WON: { icon: "trophy", color: "#10B981", bgColor: "#D1FAE5" },
	DEAL_LOST: { icon: "close-circle", color: "#6B7280", bgColor: "#F3F4F6" },
	// Legacy types
	LEAD: { icon: "people", color: "#3B82F6", bgColor: "#DBEAFE" },
	TASK: { icon: "checkbox", color: "#F59E0B", bgColor: "#FEF3C7" },
	SYSTEM: { icon: "information-circle", color: "#6366F1", bgColor: "#E0E7FF" },
};

interface NotificationSection {
	title: string;
	data: AppNotification[];
}

interface SwipeableNotificationProps {
	item: AppNotification;
	colors: typeof Colors.light;
	onPress: (item: AppNotification) => void;
	onMarkRead: (item: AppNotification) => void;
	onDelete: (item: AppNotification) => void;
	formatTime: (date: string) => string;
	t: (key: string, params?: Record<string, any>) => string;
}

// Swipeable notification component
function SwipeableNotification({ item, colors, onPress, onMarkRead, onDelete, formatTime, t }: SwipeableNotificationProps) {
	const translateX = useRef(new Animated.Value(0)).current;
	const isSwipingRef = useRef(false);

	const config = NOTIFICATION_CONFIG[item.type] || NOTIFICATION_CONFIG.SYSTEM;

	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (_, gestureState) => {
				return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
			},
			onPanResponderGrant: () => {
				isSwipingRef.current = true;
			},
			onPanResponderMove: (_, gestureState) => {
				// Only allow left swipe (negative dx)
				if (gestureState.dx < 0) {
					translateX.setValue(Math.max(gestureState.dx, -SWIPE_THRESHOLD * 2));
				}
			},
			onPanResponderRelease: (_, gestureState) => {
				isSwipingRef.current = false;
				if (gestureState.dx < -SWIPE_THRESHOLD) {
					// Keep swiped state
					Animated.spring(translateX, {
						toValue: -SWIPE_THRESHOLD * 1.8,
						useNativeDriver: true,
					}).start();
				} else {
					// Reset
					Animated.spring(translateX, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				}
			},
		}),
	).current;

	const resetSwipe = () => {
		Animated.spring(translateX, {
			toValue: 0,
			useNativeDriver: true,
		}).start();
	};

	const handlePress = () => {
		if (!isSwipingRef.current) {
			onPress(item);
		}
	};

	const handleMarkRead = () => {
		resetSwipe();
		onMarkRead(item);
	};

	const handleDelete = () => {
		resetSwipe();
		onDelete(item);
	};

	// Get notification title based on type
	const getNotificationTitle = (): string => {
		switch (item.type) {
			case "TASK_REMINDER":
				return t("notifications.types.taskReminder");
			case "TASK_OVERDUE":
				return t("notifications.types.taskOverdue");
			case "TASK_ASSIGNED":
				return t("notifications.types.taskAssigned");
			case "LEAD_ASSIGNED":
				return t("notifications.types.leadAssigned");
			case "NO_FOLLOW_UP":
				return t("notifications.types.noFollowUp");
			case "OPPORTUNITY_STAGE":
				return t("notifications.types.opportunityStage");
			case "DEAL_WON":
				return t("notifications.types.dealWon");
			case "DEAL_LOST":
				return t("notifications.types.dealLost");
			default:
				return item.type_label || item.type;
		}
	};

	// Get notification body/description
	const getNotificationBody = (): string => {
		// Use body if available, otherwise fall back to content
		if (item.body) return item.body;
		if (item.content) return item.content;
		return "";
	};

	return (
		<View style={styles.swipeContainer}>
			{/* Background actions */}
			<View style={styles.actionsContainer}>
				<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleMarkRead}>
					<Ionicons name={item.is_read ? "mail-unread" : "mail-open"} size={20} color="#fff" />
				</TouchableOpacity>
				<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.error }]} onPress={handleDelete}>
					<Ionicons name="trash" size={20} color="#fff" />
				</TouchableOpacity>
			</View>

			{/* Notification card */}
			<Animated.View
				{...panResponder.panHandlers}
				style={[
					styles.notificationCard,
					{
						backgroundColor: item.is_read ? colors.card : colors.background,
						borderColor: item.is_read ? colors.border : colors.primary + "30",
						borderWidth: item.is_read ? 1 : 1.5,
						transform: [{ translateX }],
					},
				]}>
				<TouchableOpacity style={styles.cardContent} onPress={handlePress} activeOpacity={0.7}>
					{/* Icon */}
					<View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
						<Ionicons name={config.icon as any} size={22} color={config.color} />
					</View>

					{/* Content */}
					<View style={styles.contentContainer}>
						{/* Title row */}
						<View style={styles.titleRow}>
							<Text style={[styles.notificationTitle, { color: config.color }, !item.is_read && styles.unreadTitle]} numberOfLines={1}>
								{getNotificationTitle()}
							</Text>
							<Text style={[styles.timeText, { color: colors.textLight }]}>{formatTime(item.created_at)}</Text>
						</View>

						{/* Body */}
						<Text style={[styles.notificationBody, { color: colors.text }, !item.is_read && styles.unreadBody]} numberOfLines={2}>
							{getNotificationBody()}
						</Text>
					</View>

					{/* Unread indicator */}
					{!item.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

export default function NotificationsScreen() {
	const colorScheme = useColorScheme() ?? "light";
	const colors = Colors[colorScheme];
	const { isAuthenticated } = useAuth();
	const { t } = useTranslation();

	const [notifications, setNotifications] = useState<AppNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchNotifications = async (isRefresh = false) => {
		if (!isAuthenticated) return;
		try {
			if (!isRefresh) setLoading(true);
			const response = await api.getNotifications();
			// Handle different response structures
			const data = Array.isArray(response) ? response : (response as any).data?.data || (response as any).data || [];
			setNotifications(data);
			// Calculate unread count from data
			const unread = data.filter((n: AppNotification) => !n.is_read).length;
			setUnreadCount(unread);
		} catch (error) {
			console.error("Error fetching notifications:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (!isAuthenticated) return;
			fetchNotifications();
		}, [isAuthenticated]),
	);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchNotifications(true);
	};

	const handleMarkAllAsRead = async () => {
		try {
			await api.markAllNotificationsAsRead();
			fetchNotifications(true);
		} catch (error) {
			console.error("Error marking all as read:", error);
		}
	};

	const handleNotificationPress = async (notification: AppNotification) => {
		// Mark as read
		if (!notification.is_read) {
			try {
				await api.markNotificationAsRead(notification.id);
				setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
				setUnreadCount((prev) => Math.max(0, prev - 1));
			} catch (error) {
				console.error("Error marking as read:", error);
			}
		}

		// Navigate based on type and payload
		if (notification.payload) {
			// Task-related notifications
			if (["TASK", "TASK_REMINDER", "TASK_ASSIGNED", "TASK_OVERDUE"].includes(notification.type) && notification.payload.task_id) {
				router.push(`/task/${notification.payload.task_id}`);
				return;
			}

			// Lead-related notifications
			if (["LEAD", "LEAD_ASSIGNED", "NO_FOLLOW_UP"].includes(notification.type) && notification.payload.lead_id) {
				router.push(`/lead/${notification.payload.lead_id}`);
				return;
			}

			// Opportunity-related notifications
			if (["OPPORTUNITY_STAGE", "DEAL_WON", "DEAL_LOST"].includes(notification.type) && notification.payload.opportunity_id) {
				router.push(`/opportunity/${notification.payload.opportunity_id}`);
				return;
			}
		}

		// Use related_type and related_id if available
		if (notification.related_type && notification.related_id) {
			switch (notification.related_type) {
				case "task":
					router.push(`/task/${notification.related_id}`);
					break;
				case "customer":
					router.push(`/lead/${notification.related_id}`);
					break;
				case "opportunity":
					router.push(`/opportunity/${notification.related_id}`);
					break;
			}
		}
	};

	const handleMarkRead = async (notification: AppNotification) => {
		try {
			if (notification.is_read) {
				// Mark as unread
				await api.markNotificationAsUnread(notification.id);
				setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: false } : n)));
				setUnreadCount((prev) => prev + 1);
			} else {
				// Mark as read
				await api.markNotificationAsRead(notification.id);
				setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
				setUnreadCount((prev) => Math.max(0, prev - 1));
			}
		} catch (error) {
			console.error("Error toggling read status:", error);
		}
	};

	const handleDelete = async (notification: AppNotification) => {
		Alert.alert(t("notifications.delete"), t("common.confirmDelete"), [
			{ text: t("common.cancel"), style: "cancel" },
			{
				text: t("common.delete"),
				style: "destructive",
				onPress: async () => {
					try {
						await api.deleteNotification(notification.id);
						setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
						if (!notification.is_read) {
							setUnreadCount((prev) => Math.max(0, prev - 1));
						}
					} catch (error) {
						console.error("Error deleting notification:", error);
					}
				},
			},
		]);
	};

	// Group notifications by date
	const groupNotificationsByDate = (): NotificationSection[] => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const groups: { today: AppNotification[]; yesterday: AppNotification[]; earlier: AppNotification[] } = {
			today: [],
			yesterday: [],
			earlier: [],
		};

		// Sort by created_at descending and unread first
		const sortedNotifications = [...notifications].sort((a, b) => {
			// Unread notifications come first
			if (a.is_read !== b.is_read) {
				return a.is_read ? 1 : -1;
			}
			// Then sort by date
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
		});

		sortedNotifications.forEach((notification) => {
			const notifDate = new Date(notification.created_at);
			const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

			if (notifDay.getTime() === today.getTime()) {
				groups.today.push(notification);
			} else if (notifDay.getTime() === yesterday.getTime()) {
				groups.yesterday.push(notification);
			} else {
				groups.earlier.push(notification);
			}
		});

		const sections: NotificationSection[] = [];
		if (groups.today.length > 0) {
			sections.push({ title: t("notifications.today"), data: groups.today });
		}
		if (groups.yesterday.length > 0) {
			sections.push({ title: t("notifications.yesterday"), data: groups.yesterday });
		}
		if (groups.earlier.length > 0) {
			sections.push({ title: t("notifications.earlier"), data: groups.earlier });
		}

		return sections;
	};

	const formatTimeAgo = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return t("common.justNow");
		if (diffInMinutes < 60) return t("common.minutesAgo", { count: diffInMinutes });
		if (diffInMinutes < 1440) return t("common.hoursAgo", { count: Math.floor(diffInMinutes / 60) });
		return t("common.daysAgo", { count: Math.floor(diffInMinutes / 1440) });
	};

	const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
		<View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
			<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{section.title}</Text>
		</View>
	);

	const renderNotificationItem = ({ item }: { item: AppNotification }) => <SwipeableNotification item={item} colors={colors} onPress={handleNotificationPress} onMarkRead={handleMarkRead} onDelete={handleDelete} formatTime={formatTimeAgo} t={t} />;

	const sections = groupNotificationsByDate();

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Header */}
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<View style={styles.headerLeft}>
					<Text style={[styles.title, { color: colors.text }]}>{t("notifications.title")}</Text>
					{unreadCount > 0 && (
						<View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
							<Text style={styles.unreadBadgeText}>{unreadCount}</Text>
						</View>
					)}
				</View>
				{unreadCount > 0 && (
					<TouchableOpacity style={[styles.markAllButton, { backgroundColor: colors.primary + "10" }]} onPress={handleMarkAllAsRead}>
						<Ionicons name="checkmark-done" size={16} color={colors.primary} />
						<Text style={[styles.markAllText, { color: colors.primary }]}>{t("notifications.markAllRead")}</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Swipe hint */}
			{notifications.length > 0 && (
				<View style={styles.swipeHint}>
					<Ionicons name="arrow-back" size={14} color={colors.textLight} />
					<Text style={[styles.swipeHintText, { color: colors.textLight }]}>{t("common.swipeForActions")}</Text>
				</View>
			)}

			{/* Notifications list */}
			{loading ? <Loading /> : notifications.length === 0 ? <EmptyState icon="notifications-outline" title={t("notifications.noNotifications")} message={t("notifications.noNotificationsMessage")} /> : <SectionList sections={sections} renderItem={renderNotificationItem} renderSectionHeader={renderSectionHeader} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />} showsVerticalScrollIndicator={false} stickySectionHeadersEnabled={true} />}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.md,
		borderBottomWidth: 1,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
	},
	title: {
		fontSize: FontSize.xxl,
		fontWeight: "bold",
	},
	unreadBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
		minWidth: 22,
		alignItems: "center",
	},
	unreadBadgeText: {
		color: "#fff",
		fontSize: FontSize.xs,
		fontWeight: "bold",
	},
	markAllButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		borderRadius: BorderRadius.md,
		gap: 4,
	},
	markAllText: {
		fontSize: FontSize.sm,
		fontWeight: "500",
	},
	swipeHint: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: Spacing.sm,
		gap: 4,
	},
	swipeHintText: {
		fontSize: FontSize.xs,
	},
	listContent: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.xxl,
	},
	sectionHeader: {
		paddingVertical: Spacing.sm,
		paddingTop: Spacing.md,
	},
	sectionTitle: {
		fontSize: FontSize.sm,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	swipeContainer: {
		marginBottom: Spacing.sm,
		position: "relative",
	},
	actionsContainer: {
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		paddingRight: Spacing.xs,
		gap: Spacing.xs,
	},
	actionButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	notificationCard: {
		borderRadius: BorderRadius.lg,
		overflow: "hidden",
	},
	cardContent: {
		flexDirection: "row",
		alignItems: "flex-start",
		padding: Spacing.md,
	},
	iconContainer: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginRight: Spacing.md,
	},
	contentContainer: {
		flex: 1,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 4,
	},
	notificationTitle: {
		fontSize: FontSize.sm,
		fontWeight: "500",
		flex: 1,
	},
	unreadTitle: {
		fontWeight: "700",
	},
	timeText: {
		fontSize: FontSize.xs,
		marginLeft: Spacing.sm,
	},
	notificationBody: {
		fontSize: FontSize.base,
		lineHeight: 20,
	},
	unreadBody: {
		fontWeight: "500",
	},
	unreadDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginLeft: Spacing.sm,
		marginTop: 4,
	},
});
