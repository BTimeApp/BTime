import { useEffect, useRef } from "react";

export function useOnTransition<T>(
  value: T,
  triggerValue: T,
  onTrigger: () => void
) {
  const prevValueRef = useRef<T | null>(null);

  useEffect(() => {
    if (value === triggerValue && prevValueRef.current !== triggerValue) {
      onTrigger();
    }

    prevValueRef.current = value;
  }, [value, triggerValue, onTrigger]);
}
