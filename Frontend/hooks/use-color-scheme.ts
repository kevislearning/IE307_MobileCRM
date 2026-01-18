// Re-export the app color scheme hook from ThemeContext
// This allows all existing components to work without changes
export { useAppColorScheme as useColorScheme } from "@/contexts/ThemeContext";

// Export the system hook as well for direct access if needed
export { useColorScheme as useSystemColorScheme } from "react-native";
