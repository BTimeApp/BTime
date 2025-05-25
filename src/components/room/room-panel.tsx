import { cn } from "@/lib/utils";

export default function RoomPanel({
    className,
    children,
  }: Readonly<{
    className?: string;
    children: React.ReactNode;
  }>) {
    console.log(className);
    return (
        <div className={"flex-row grow text-center " + className}>
            {children}
        </div>
    );
  }
  