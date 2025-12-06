export function Header({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-row bg-primary text-primary-foreground p-2">
      {children}
    </div>
  );
}

export function HeaderTitle({
  title,
}: Readonly<{
  title?: string;
}>) {
  return (
    <h1 className="grow text-2xl font-bold text-center min-w-0 truncate">
      {title}
    </h1>
  );
}
