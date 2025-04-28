"use client"

import * as React from "react"
import {
  IconDoorEnter,
  IconFileDescription,
  IconHelp,
  IconHome,
  IconLibraryPlus,
  IconSettings,
} from "@tabler/icons-react"

// import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/sidebar/nav-main"
import { NavSecondary } from "@/components/sidebar/nav-secondary"
import { NavUser } from "@/components/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "ctang",
    email: "example@gmail.com",
    avatar: "/images/C_logo.png",
  },
  navMain: [
    {
      title: "BTime",
      url: "/",
      icon: IconHome,
    },
    {
      title: "Create Room",
      url: "/create", //change this to /create
      icon: IconLibraryPlus,
    },
  ],
  
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "About",
      url: "/about",
      icon: IconHelp,
    },
    {
      title: "Docs",
      url: "/docs",
      icon: IconFileDescription,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
