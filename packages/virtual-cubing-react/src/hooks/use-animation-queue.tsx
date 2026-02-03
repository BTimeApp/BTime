import { useCallback, useRef, useState } from "react";

/**
 * Hook for handling an animation queue. Meant to be used in product code directly as a queue helper.
 * Automatically tries to process elements when adding new elems or when animations finish (handleAnimationComplete).
 */
export const useAnimationQueue = <T,>(
  customAddToQueue?: (queue: T[], newElem: T) => T[]
) => {
  const animationQueueRef = useRef<T[]>([]);
  const [currentElem, setCurrentElem] = useState<T | undefined>(undefined);
  const currentElemRef = useRef<T | undefined>(undefined);

  const processAnimationQueue = useCallback(() => {
    if (currentElemRef.current) return; //ref helps avoid stale closure

    const next = animationQueueRef.current.shift();
    if (next) {
      currentElemRef.current = next;
      setCurrentElem(next); //update state for downstream consumers to use
    }
  }, []);

  const addToAnimationQueue = useCallback(
    (newElem: T) => {
      if (customAddToQueue) {
        animationQueueRef.current = customAddToQueue(
          animationQueueRef.current,
          newElem
        );
      } else {
        //default processing - add to end
        animationQueueRef.current.push(newElem);
      }

      //immediately try to process new events
      processAnimationQueue();
    },
    [processAnimationQueue, customAddToQueue]
  );

  const handleAnimationComplete = useCallback(() => {
    currentElemRef.current = undefined;
    setCurrentElem(undefined);
    processAnimationQueue();
  }, [processAnimationQueue]);

  const clearAnimationQueue = useCallback(() => {
    animationQueueRef.current = [];
  }, []);

  return {
    currentElem,
    addToAnimationQueue,
    handleAnimationComplete,
    clearAnimationQueue,
  };
};
