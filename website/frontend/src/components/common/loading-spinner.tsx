import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import React from "react";

export default function LoadingSpinner({
  className,
  ...props
}: React.ComponentProps<typeof LoaderCircle>) {
  return (
    <LoaderCircle
      className={cn(
        "animate-spin text-primary dark:text-primary-foreground",
        className
      )}
      {...props}
    />
  );
}
