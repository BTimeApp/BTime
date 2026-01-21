import KeyListener from "../common/key-listener";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

type KeyboardKeyProps = {
  keyName: string; // can be a key or keycode
  primaryText?: string;
  secondaryText?: string;
  className?: string;
};

export const KeyboardKey: React.FC<
  KeyboardKeyProps & Omit<React.ComponentProps<typeof KeyListener>, "keyName">
> = ({
  keyName,
  className,
  primaryText,
  secondaryText,
  ...keyListenerProps
}) => {
  return (
    <KeyListener {...keyListenerProps} keyName={keyName}>
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center h-14 w-14 text-lg",
          className
        )}
      >
        {primaryText}
        <p className="text-sm">{secondaryText}</p>
      </div>
    </KeyListener>
  );
};

export const KeyboardListenerKey: React.FC<
  KeyboardKeyProps & Omit<React.ComponentProps<typeof KeyListener>, "keyName">
> = ({ className, ...props }) => {
  const [isPressed, setIsPressed] = useState<boolean>(false);

  return (
    <KeyboardKey
      className={cn(
        "border border-container-5 rounded-md",
        className,
        isPressed ? "bg-white/30 scale-105" : ""
      )}
      {...props}
      onKeyDown={() => {
        setIsPressed(true);
        props.onKeyDown?.();
      }}
      onKeyUp={() => {
        setIsPressed(false);
        props.onKeyUp?.();
      }}
    />
  );
};
