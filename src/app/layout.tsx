import type { Metadata } from "next";
import { inter } from '@/app/ui/fonts';
import "./styles/global.css";
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { ThemeProvider } from "next-themes";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { SocketProvider } from "@/components/socket/socket";

export const metadata: Metadata = {
  title: "BTime",
  description: "Rubik's Cube Timer by Berkeley's cube club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      suppressHydrationWarning={true} /* Surely there's a better way to stop the warning */
      lang="en"
    >
      <body
        className={`${inter.className} antialiased`}
      >
        <SocketProvider>
          <ThemeProvider
            attribute="class" 
            defaultTheme="system"
            enableSystem={true}
          >
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <div className="flex flex-1 flex-col gap-4 pt-0">
                  <div className="min-h-[100vh] flex-1 rounded-xl bg-background md:min-h-min">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </SidebarProvider>
          </ThemeProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
