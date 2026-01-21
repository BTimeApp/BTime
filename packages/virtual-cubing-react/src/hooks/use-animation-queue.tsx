import type { Move } from "cubing/alg";

import { useCallback, useRef, useState } from "react";

/**
 * Hook for animating moves. Meant to be used in product code directly as a queue helper.
 * Automatically tries to process moves when adding new moves or when moves finish (handleAnimationComplete).
 */
export const useAnimationQueue = () => {
  const animationQueueRef = useRef<Move[]>([]);
  const [currentMove, setCurrentMove] = useState<Move | undefined>(undefined);
  const currentMoveRef = useRef<Move | undefined>(undefined);

  const processAnimationQueue = useCallback(() => {
    if (currentMoveRef.current) return; //ref helps avoid stale closure

    const next = animationQueueRef.current.shift();
    if (next) {
      currentMoveRef.current = next;
      setCurrentMove(next); //update state for downstream consumers to use
    }
  }, []);

  const addToAnimationQueue = useCallback(
    (newMove: Move) => {
      animationQueueRef.current.push(newMove);
      processAnimationQueue();
    },
    [processAnimationQueue]
  );

  const handleAnimationComplete = useCallback(() => {
    currentMoveRef.current = undefined;
    setCurrentMove(undefined);
    processAnimationQueue();
  }, [processAnimationQueue]);

  return {
    currentMove,
    addToAnimationQueue,
    handleAnimationComplete,
  };
};
