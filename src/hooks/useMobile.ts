import { useEffect, useState } from "react";

/**
 * This hook is more accurately useIsTouchscreen, but this is close enough.
 */
export function useIsTouchscreen() {
  const [isTouchScreen, setIsTouchscreen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for maxTouchPoints (modern approach)
      const hasMaxTouchPoints = navigator.maxTouchPoints > 0;

      // Check for ontouchstart (older, but still useful for broad compatibility)
      const hasOntouchstart = 'ontouchstart' in window;

      setIsTouchscreen(hasMaxTouchPoints || hasOntouchstart);
    }
  }, []);

  return isTouchScreen;
}