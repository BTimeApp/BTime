import { Result } from "@/types/result";
import { useEffect, useRef, useState } from "react";

type UserLiveTimerProps = {
  className?: string;
  startTime: number;
};

export default function UserLiveTimer({ className, startTime }: UserLiveTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const startRef = useRef<number>(startTime ? startTime : performance.now());
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const now = performance.now();
      setElapsed(now - startRef.current);
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return <div className={className}>{Result.timeToString(Math.floor(elapsed / 10))}</div>;
}
