import vi from "@/i18n/locales/vi";
import en from "@/i18n/locales/en";

export type Language = "vi" | "en";

export const languages: Record<Language, string> = {
	vi: "Tiếng Việt",
	en: "English",
};

export const translations = {
	vi,
	en,
};

export type TranslationKeys = typeof vi;

// Helper function to get nested translation value
export function getTranslation(translations: TranslationKeys, key: string, params?: Record<string, string | number>): string {
	const keys = key.split(".");
	let result: unknown = translations;

	for (const k of keys) {
		if (result && typeof result === "object" && k in result) {
			result = (result as Record<string, unknown>)[k];
		} else {
			return key; // Return key if translation not found
		}
	}

	if (typeof result !== "string") {
		return key;
	}

	// Replace parameters like {{count}} with actual values
	if (params) {
		return result.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
			return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
		});
	}

	return result;
}

export { vi, en };
