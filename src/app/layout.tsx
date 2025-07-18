import type { Metadata } from "next";
import { inter } from "@/app/ui/fonts";
import "./styles/global.css";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ThemeProvider } from "next-themes";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SessionProvider } from "@/context/sessionContext";

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
        <link rel="stylesheet" href="https://cdn.cubing.net/v0/css/@cubing/icons/css"/> 
      </head>
      <body className={`${inter.className} antialiased h-screen flex flex-col`}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
          >
            <SidebarProvider defaultOpen={false}>
              <AppSidebar />
              <SidebarInset>
                <div className="flex flex-1 flex-col gap-4 pt-0">
                  <div className="flex flex-col flex-1 h-screen rounded-xl bg-background">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </SidebarProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
