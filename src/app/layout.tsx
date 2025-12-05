import type { Metadata } from "next";
import { inter } from "@/app/ui/fonts";
import "@/app/styles/global.css";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ThemeProvider } from "next-themes";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SessionProvider } from "@/context/session-context";
import { SocketProvider } from "@/context/socket-context";
import Script from "next/script";
import { Toaster } from "sonner";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "BTime",
  description: "Rubik's Cube Timer by Berkeley's cube club",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  "use memo";
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <html
      suppressHydrationWarning={
        true
      } /* Surely there's a better way to stop the warning */
      lang="en"
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.cubing.net/v0/css/@cubing/icons/css"
        />

        {/* scramble-display - can switch back to this once ready to open source */}
        {/* <Script src="https://cdn.cubing.net/v0/js/scramble-display" type="module"></Script> */}

        {/* Cubing/twisty */}
        <Script
          src="https://cdn.cubing.net/v0/js/cubing/twisty"
          type="module"
        ></Script>
      </head>
      <body className={`${inter.className} antialiased h-screen flex flex-col`}>
        <SessionProvider>
          <SocketProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem={true}
            >
              <SidebarProvider defaultOpen={defaultOpen}>
                <AppSidebar />
                <SidebarInset>
                  <SidebarTrigger className="ml-1 mt-1 p-1 text-foreground fixed hover:bg-white/30 transition rounded-md" />
                  {children}
                </SidebarInset>
              </SidebarProvider>
            </ThemeProvider>
          </SocketProvider>
        </SessionProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
