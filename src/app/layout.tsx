import type { Metadata } from "next";
import { inter } from "@/app/ui/fonts";
import "@/app/styles/global.css";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ThemeProvider } from "next-themes";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SessionProvider } from "@/context/session-context";
import { SocketProvider } from "@/context/socket-context";
import Script from "next/script";
import { Toaster } from "sonner";

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
      <Script src="https://cdn.cubing.net/v0/js/cubing/twisty" type="module"></Script>

      </head>
      <body className={`${inter.className} antialiased h-screen flex flex-col`}>
        <SessionProvider>
          <SocketProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem={true}
            >
              <SidebarProvider defaultOpen={false}>
                <AppSidebar />
                <SidebarInset>
                  <div className="flex flex-1 flex-col gap-4 pt-0 h-full">
                    <div className="flex flex-col flex-1 rounded-xl bg-background h-full">
                      {children}
                    </div>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </ThemeProvider>
          </SocketProvider>
        </SessionProvider>
        <Toaster position="top-center" richColors/>
      </body>
    </html>
  );
}
