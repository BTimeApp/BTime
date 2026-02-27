import type React from "react";

import {
  useBTimeKeyDownKeybind,
  useBTimeKeyUpKeybind,
} from "@/context/keybind-context";
import { useCallback, useEffect, useRef } from "react";

type KeyListenerProps = {
  keyName?: string; //the name of the key to listen to. Will match both event.key and event.code.
  onKeyDown?: () => void; //callback to use upon key first being pressed
  onKeyUp?: () => void; //callback to use upon key first being released
  onDismount?: () => void; //callback to use upon this component being dismounted
  forceInitialValue?: boolean; //if needed, we can "force" the initial value of the key. This is a workaround
  children?: React.ReactNode;
};

/**
 * A listener component that triggers optional callbacks when the key is first pressed or released.
 */
function KeyListener({
  keyName = "Space",
  onKeyDown,
  onKeyUp,
  onDismount,
  forceInitialValue = false,
  children,
}: KeyListenerProps) {
  /** It is not possible to listen to the actual state of the key upon first mounting.
   *  That would require listening some global key state tracking/listeners that aren't necessary yet.
   */
  const isPressedRef = useRef(forceInitialValue);

  const handleKeyDown = useCallback(() => {
    if (!isPressedRef.current) {
      isPressedRef.current = true;
      onKeyDown?.();
    }
  }, [onKeyDown]);

  const handleKeyUp = useCallback(() => {
    if (isPressedRef.current) {
      isPressedRef.current = false;
      onKeyUp?.();
    }
  }, [onKeyUp]);

  // register keybinds with the global keybind handlers - avoids attaching new event listeners for every keybind
  useBTimeKeyDownKeybind(keyName, handleKeyDown);
  useBTimeKeyUpKeybind(keyName, handleKeyUp);

  useEffect(() => {
    return () => {
      onDismount?.();
    };
  }, [onDismount]);

  return children;
}

export default KeyListener;
