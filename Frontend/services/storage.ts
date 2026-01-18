import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
	ACCESS_TOKEN: "access_token",
	REFRESH_TOKEN: "refresh_token",
	USER: "user",
};

export const storage = {
	async get(key: string): Promise<string | null> {
		return AsyncStorage.getItem(key);
	},

	async set(key: string, value: string): Promise<void> {
		await AsyncStorage.setItem(key, value);
	},

	async remove(key: string): Promise<void> {
		await AsyncStorage.removeItem(key);
	},

	async getAccessToken(): Promise<string | null> {
		return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
	},

	async setAccessToken(token: string): Promise<void> {
		await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
	},

	async getRefreshToken(): Promise<string | null> {
		return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
	},

	async setRefreshToken(token: string): Promise<void> {
		await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
	},

	async getUser(): Promise<any | null> {
		const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
		return user ? JSON.parse(user) : null;
	},

	async setUser(user: any): Promise<void> {
		await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
	},

	async clearAll(): Promise<void> {
		await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER]);
	},
};
