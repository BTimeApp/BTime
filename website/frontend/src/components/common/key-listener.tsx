import React, { useEffect, useRef } from "react";

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
   *  TODO - implement such trackers/listeners if need arises
   */
  const isPressedRef = useRef(forceInitialValue);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === keyName && !isPressedRef.current) {
        isPressedRef.current = true;
        onKeyDown?.();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === keyName && isPressedRef.current) {
        isPressedRef.current = false;
        onKeyUp?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      onDismount?.();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onKeyDown, onKeyUp, keyName, onDismount]);

  if (!children) return null;

  return children;
}

export default KeyListener;
