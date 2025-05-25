import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Header({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <div className="flex lg:min-h-20 h-auto p-2 bg-primary">
            <SidebarTrigger className="-ml-1 text-foreground" />
            <div className = "flex-row grow text-primary-foreground content-center">
                {children}
            </div>
        </div>
    );
  }
  