import type React from "react";

import { useEffect, useEffectEvent, useRef } from "react";

type KeyListenerProps = {
  keyName?: string; //the name of the key to listen to. For example, "Space" for the space bar
  onKeyDown?: () => void; //callback to use upon key first being pressed
  onKeyUp?: () => void; //callback to use upon key first being released
  onDismount?: () => void; //callback to use upon this component being dismounted
  forceInitialValue?: boolean; //if needed, we can "force" the initial value of the key. This is a workaround
  children?: React.ReactNode;
};

/** A listener component that triggers optional callbacks when the key is first pressed or released.
 *
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

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      (event.code === keyName || event.key === keyName) &&
      !isPressedRef.current
    ) {
      isPressedRef.current = true;
      onKeyDown?.();
    }
  });

  const handleKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (
      (event.code === keyName || event.key === keyName) &&
      isPressedRef.current
    ) {
      isPressedRef.current = false;
      onKeyUp?.();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      onDismount?.();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onDismount]);

  return children;
}

export default KeyListener;
