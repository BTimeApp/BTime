'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';
import { IconMoon, IconSun } from "@tabler/icons-react";


export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent mismatch between server and client
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    // <Button
    //   onClick={() => setTheme(isDark ? 'light' : 'dark')}
    //   className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded"
    // >
    //   
    // </Button>

    <SidebarMenuItem>
        <SidebarMenuButton
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
            {isDark ? <IconSun/> : <IconMoon/>}
            <span>Toggle Theme</span>
        </SidebarMenuButton>    
    </SidebarMenuItem>
  );
}
