import { cn } from "@/lib/utils";

export function Header({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "flex flex-row bg-primary text-primary-foreground p-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function HeaderTitle({
  title,
  className,
}: Readonly<{
  title?: string;
  className?: string;
}>) {
  return (
    <h1
      className={cn(
        "grow text-2xl font-bold text-center min-w-0 truncate",
        className
      )}
    >
      {title}
    </h1>
  );
}
