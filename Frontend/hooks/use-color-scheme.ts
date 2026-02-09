// Re-export hook color scheme của ứng dụng từ ThemeContext
// Cho phép các component hiện tại hoạt động mà không cần thay đổi
export { useAppColorScheme as useColorScheme } from "@/contexts/ThemeContext";

// Export hook system nếu cần truy cập trực tiếp
export { useColorScheme as useSystemColorScheme } from "react-native";
