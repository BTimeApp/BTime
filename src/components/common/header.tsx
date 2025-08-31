import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Header({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex shrink items-stretch p-2 bg-primary w-full">
      <SidebarTrigger className="-ml-1 -mt-1 text-foreground fixed" />
      <div className="flex-row grow text-primary-foreground content-center">
        {children}
      </div>
    </div>
  );
}
