import { cn } from "@/lib/utils";

export function Footer({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-row shrink-0 bg-container-2 p-2",
        className
      )}
    >
      {children}
    </div>
  );
}
