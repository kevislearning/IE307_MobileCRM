import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Language, translations, getTranslation, TranslationKeys } from "@/i18n";

const LANGUAGE_KEY = "@language";

interface LanguageContextType {
	language: Language;
	setLanguage: (lang: Language) => Promise<void>;
	t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
	children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
	const [language, setLanguageState] = useState<Language>("vi");
	const [isLoaded, setIsLoaded] = useState(false);

	// Tải ngôn ngữ đã lưu khi khởi tạo
	useEffect(() => {
		loadLanguage();
	}, []);

	const loadLanguage = async () => {
		try {
			const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
			if (savedLanguage && (savedLanguage === "vi" || savedLanguage === "en")) {
				setLanguageState(savedLanguage as Language);
			}
		} catch (error) {
			console.error("Error loading language:", error);
		} finally {
			setIsLoaded(true);
		}
	};

	const setLanguage = async (lang: Language) => {
		try {
			await AsyncStorage.setItem(LANGUAGE_KEY, lang);
			setLanguageState(lang);
		} catch (error) {
			console.error("Error saving language:", error);
		}
	};

	const t = useCallback(
		(key: string, params?: Record<string, string | number>): string => {
			const currentTranslations = translations[language] as TranslationKeys;
			return getTranslation(currentTranslations, key, params);
		},
		[language]
	);

	// Chờ ngôn ngữ được tải xong trước khi render
	if (!isLoaded) {
		return null;
	}

	return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (context === undefined) {
		throw new Error("useLanguage must be used within a LanguageProvider");
	}
	return context;
}

// Custom hook chỉ dùng cho dịch thuật
export function useTranslation() {
	const { t } = useLanguage();
	return { t };
}
