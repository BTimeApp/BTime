import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

type KeybindButtonProps = React.ComponentProps<typeof Button> & {
  keys: string[];
};

export function KeybindButton({ keys, onClick, ...props }: KeybindButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const normalized = (k: string) => k.toLowerCase();

      const wantedKeys = keys.map(normalized);
      const pressed: string[] = [];

      if (e.ctrlKey) pressed.push("ctrl");
      if (e.shiftKey) pressed.push("shift");
      if (e.altKey) pressed.push("alt");
      if (e.metaKey) pressed.push("meta");
      pressed.push(normalized(e.key));

      // match when wanted keys are equal to the pressed keys
      const match =
        wantedKeys.length === pressed.length &&
        wantedKeys.every((k) => pressed.includes(k));

      if (match) {
        e.preventDefault();
        btnRef.current?.click();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keys, onClick]);

  return <Button ref={btnRef} onClick={onClick} {...props} />;
}
