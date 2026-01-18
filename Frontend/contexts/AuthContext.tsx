import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { api } from "@/services/api";
import { storage } from "@/services/storage";
import { User } from "@/types";

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	updateUser: (user: User) => void;
	isSales: boolean;
	isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Handle auth failure (token expired and refresh failed)
	const handleAuthFailure = useCallback(async () => {
		console.log("Auth failure - clearing session");
		await storage.clearAll();
		setUser(null);
	}, []);

	useEffect(() => {
		// Set the auth failure callback for API client
		api.setOnAuthFailure(handleAuthFailure);
		checkAuth();
	}, [handleAuthFailure]);

	const checkAuth = async () => {
		try {
			const token = await storage.getAccessToken();
			if (token) {
				const response = await api.getMe();
				setUser(response.user);
				await storage.setUser(response.user);
			}
		} catch (error) {
			await storage.clearAll();
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	};

	const login = async (email: string, password: string) => {
		const response = await api.login(email, password);
		await storage.setAccessToken(response.access_token);
		await storage.setRefreshToken(response.refresh_token);
		await storage.setUser(response.user);
		setUser(response.user);
	};

	const logout = async () => {
		try {
			await api.logout(); // cần token nên gọi trước khi xóa storage
		} catch (error) {
			// Ignore server error, vẫn đăng xuất local
		} finally {
			await storage.clearAll();
			setUser(null);
		}
	};

	const updateUser = (updatedUser: User) => {
		setUser(updatedUser);
		storage.setUser(updatedUser);
	};

	const isManager = user?.role === "admin" || user?.role === "owner";
	const isSales = user?.role === "staff";

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isAuthenticated: !!user,
				login,
				logout,
				updateUser,
				isSales,
				isManager,
			}}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
