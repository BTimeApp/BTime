import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority"

export default function LoginButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  <Button
    className={cn(className)}
    variant={variant}
    size={size}
    asChild={asChild}
    onClick={() => {window.location.href = "/auth/wca";}}
  >
    Log In (WCA)
  </Button>;
}
