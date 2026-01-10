import { cn } from "@/lib/utils";
import React from "react";

export default function PageWrapper({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex-1 flex flex-col h-screen", className)}>
      {children}
    </div>
  );
}
