// expo-notifications temporarily disabled
import { api } from "@/services/api";

// Stub: notifications disabled
export const initNotifications = async () => {
	console.log("[Notifications] expo-notifications temporarily disabled");
	return { granted: false };
};

export const syncSmartReminders = async () => {
	// expo-notifications temporarily disabled - only trigger backend reminders
	try {
		await Promise.allSettled([api.triggerTaskReminders(), api.triggerFollowUpDue()]);
	} catch (error) {
		console.warn("Smart reminders sync failed:", error);
	}
};
