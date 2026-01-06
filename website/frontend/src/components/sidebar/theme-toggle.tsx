import { SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar";
import { useTheme } from "@/context/theme-context";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent mismatch between server and client
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={() => setTheme(isDark ? "light" : "dark")}>
        {isDark ? <IconSun /> : <IconMoon />}
        <span>Toggle Theme</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
