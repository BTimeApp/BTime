import { useEffect, useRef, useState } from "react";

export function useStartTimeOnTransition<T>(value: T, triggerValue: T): number | undefined {
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const prevValueRef = useRef<T | null>(null);

  useEffect(() => {
    if (value === triggerValue && prevValueRef.current !== triggerValue) {
      setStartTime(performance.now());
    }
    prevValueRef.current = value;
  }, [value, triggerValue]);

  return startTime;
}