import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";

export default function LogoutButton({
  className,
  variant = "primary",
  size,
  asChild = false,
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  return (
    <Button
      className={cn(className)}
      variant={variant}
      size={size}
      asChild={asChild}
      onClick={() => {
        window.location.href = `/logout?redirect=${window.location.pathname}`;
      }}
    >
      Log Out
    </Button>
  );
}
