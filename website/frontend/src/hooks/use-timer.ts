import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer() {
  const [time, setTime] = useState<number>(0); //time in centiseconds
  const [isRunning, setIsRunning] = useState<boolean>(false); // whether or not timer currently running
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);

  const lastTimeRef = useRef<number>(0);

  // Animation loop - only runs when isRunning is true
  useEffect(() => {
    if (!isRunning) return;

    const update = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const newTime = Math.floor(elapsed / 10);

      // Only trigger re-render when centisecond changes
      if (newTime !== lastTimeRef.current) {
        lastTimeRef.current = newTime;
        setTime(newTime);
      }
      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  const startTimer = useCallback((startTime?: number) => {
    startTimeRef.current = startTime ?? performance.now();
    setTime(0);
    setIsRunning(true);
  }, []);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const finalTime = Math.floor(elapsed / 10);

    setTime(0);
    return finalTime;
  }, []);

  return {
    time,
    startTimer,
    stopTimer,
    isRunning,
  };
}
