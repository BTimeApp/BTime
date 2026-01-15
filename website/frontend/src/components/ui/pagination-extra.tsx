import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

type PaginationButtonProps = {
  isActive?: boolean;
} & React.ComponentProps<typeof Button>;

function PaginationButton({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationButtonProps) {
  return (
    <Button
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-button"
      data-active={isActive}
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(className)}
      {...props}
    />
  );
}

function PaginationPreviousButton({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButton>) {
  return (
    <PaginationButton
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationButton>
  );
}

function PaginationNextButton({
  className,
  ...props
}: React.ComponentProps<typeof PaginationButton>) {
  return (
    <PaginationButton
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationButton>
  );
}

export {
  type PaginationButtonProps,
  PaginationButton,
  PaginationPreviousButton,
  PaginationNextButton,
};
