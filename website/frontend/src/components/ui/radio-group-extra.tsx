import { cn } from "@/lib/utils";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

interface CustomRadioItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function CustomRadioItem({
  value,
  children,
  className,
}: CustomRadioItemProps) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={cn(
        "w-full border-2 rounded-lg transition-all cursor-pointer",
        "hover:border-primary/30 hover:bg-highlight/5",
        "data-[state=checked]:border-primary data-[state=checked]:bg-highlight/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}
