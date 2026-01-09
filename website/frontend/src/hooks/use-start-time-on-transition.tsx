import { useMemo, useRef } from "react";

export function useStartTimeOnTransition<T>(
  value: T,
  triggerValue: T
): number | undefined {
  // const startTimeRef = useRef<number | null>(null);
  // const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const prevValueRef = useRef<T | null>(null);

  // useEffect(() => {
  //   if (value === triggerValue && prevValueRef.current !== triggerValue) {
  //     // setStartTime(performance.now());
  //     startTimeRef.current = performance.now();
  //   }
  //   prevValueRef.current = value;
  // }, [value, triggerValue]);
  // return startTimeRef.current;
  return useMemo(() => {
    if (value === triggerValue && prevValueRef.current !== triggerValue) {
      prevValueRef.current = value;
      // eslint-disable-next-line react-hooks/purity
      return performance.now();
    }
    prevValueRef.current = value;
    return undefined;
  }, [value, triggerValue]);
}
