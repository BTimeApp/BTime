"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { IconMoon, IconSun } from "@tabler/icons-react";

export default function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent mismatch between server and client
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={() => setTheme(isDark ? "light" : "dark")}>
        {isDark ? <IconSun /> : <IconMoon />}
        <span>Toggle Theme</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
