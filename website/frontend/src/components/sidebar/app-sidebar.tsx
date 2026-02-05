"use client";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import ThemeToggle from "@/components/sidebar/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  IconBluetooth,
  IconCube3dSphere,
  IconHome,
  IconLibraryPlus,
} from "@tabler/icons-react";
import * as React from "react";

const data = {
  navMain: [
    {
      title: "BTime",
      url: "/",
      icon: IconHome,
    },
    {
      title: "Create Room",
      url: "/create",
      icon: IconLibraryPlus,
    },
  ],

  navSecondary: [
    {
      title: "Virtual",
      url: "/virtual",
      icon: IconCube3dSphere,
    },
    {
      title: "Bluetooth",
      url: "/bluetooth",
      icon: IconBluetooth,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // this will automatically try to log in and fetch a user.
  const { setOpen } = useSidebar();

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
      {...props}
    >
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavMain items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />

        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
