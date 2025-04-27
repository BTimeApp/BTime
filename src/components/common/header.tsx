import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Header({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
        <div className="flex h-16 p-4 bg-primary-foreground">
            <SidebarTrigger className="-ml-1" />
            <div className = "grow">
                {children}
            </div>
            {/* <h1 </div>= "grow font-bold text-center text-white text-2xl">BTime</h1> */}
        </div>
    );
  }
  