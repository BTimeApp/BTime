import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Header({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <div className="flex h-20 p-4 bg-primary">
            <SidebarTrigger className="-ml-1 text-foreground" />
            <div className = "flex-row grow text-primary-foreground">
                {children}
            </div>
        </div>
    );
  }
  