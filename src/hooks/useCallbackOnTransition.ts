import { useEffect, useRef } from "react";

/**
 * Allows a user to call a callback whenever a variable (value) turns into triggerValue from a value that isn't triggerValue.
 */
export function useCallbackOnTransition<T>(value: T, triggerValue: T, callback: () => void): void {
  const prevValueRef = useRef<T | null>(null);

  useEffect(() => {
    if (value === triggerValue && prevValueRef.current !== triggerValue) {
      callback();
    }
    prevValueRef.current = value;
  }, [value, triggerValue, callback]);

}