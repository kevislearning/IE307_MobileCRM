// expo-notifications tạm thời vô hiệu hóa
import { api } from "@/services/api";

// Stub: thông báo đã vô hiệu hóa
export const initNotifications = async () => {
	console.log("[Notifications] expo-notifications temporarily disabled");
	return { granted: false };
};

export const syncSmartReminders = async () => {
	// expo-notifications tạm thời vô hiệu hóa - chỉ kích hoạt nhắc nhở từ backend
	try {
		await Promise.allSettled([api.triggerTaskReminders(), api.triggerFollowUpDue()]);
	} catch (error) {
		console.warn("Smart reminders sync failed:", error);
	}
};
