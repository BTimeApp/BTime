import { SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar";
import { useTheme } from "@/context/theme-context";
import { IconMoon, IconSun } from "@tabler/icons-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setTheme(isDark ? "light" : "dark")}
        onKeyDown={(e) => e.preventDefault()}
      >
        {isDark ? <IconSun /> : <IconMoon />}
        <span>Toggle Theme</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
