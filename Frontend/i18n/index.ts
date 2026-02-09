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

// Hàm hỗ trợ lấy giá trị dịch lồng nhau
export function getTranslation(translations: TranslationKeys, key: string, params?: Record<string, string | number>): string {
	const keys = key.split(".");
	let result: unknown = translations;

	for (const k of keys) {
		if (result && typeof result === "object" && k in result) {
			result = (result as Record<string, unknown>)[k];
		} else {
			return key; // Trả về key nếu không tìm thấy bản dịch
		}
	}

	if (typeof result !== "string") {
		return key;
	}

	// Thay thế tham số như {{count}} với giá trị thực tế
	if (params) {
		return result.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
			return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
		});
	}

	return result;
}

export { vi, en };
