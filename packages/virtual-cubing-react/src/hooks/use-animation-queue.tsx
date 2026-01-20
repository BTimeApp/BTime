import type { Move } from "cubing/alg";

import { useCallback, useState } from "react";

export const useAnimationQueue = () => {
  const [animationQueue, setAnimationQueue] = useState<Move[]>([]);
  const [currentMove, setCurrentMove] = useState<Move | undefined>(undefined);

  const addToAnimationQueue = useCallback((newMove: Move) => {
    setAnimationQueue((prev) => [...prev, newMove]);
  }, []);

  const processAnimationQueue = useCallback(() => {
    if (currentMove || animationQueue.length === 0) return;

    const [next, ...rest] = animationQueue;
    setAnimationQueue(rest);

    setCurrentMove(next);
  }, [currentMove, animationQueue]);

  const handleAnimationComplete = useCallback(() => {
    setCurrentMove(undefined);
    // Process next animation in animationQueue
    if (animationQueue.length > 0) {
      const [next, ...rest] = animationQueue;
      setAnimationQueue(rest);

      setCurrentMove(next);
    }
  }, [animationQueue]);

  return {
    currentMove,
    animationQueue,
    addToAnimationQueue,
    processAnimationQueue,
    handleAnimationComplete,
  };
};
