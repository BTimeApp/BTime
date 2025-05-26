import { cn } from "@/lib/utils";

export default function RoomPanel({
    className,
    children,
  }: Readonly<{
    className?: string;
    children: React.ReactNode;
  }>) {
    return (
        <div className={"flex flex-col text-center " + className}>
            {children}
        </div>
    );
  }
  