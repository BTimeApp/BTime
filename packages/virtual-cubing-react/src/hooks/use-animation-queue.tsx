import { AnimationQueue } from "./animation-queue";
import {
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * React hook for AnimationQueue integration
 *
 * Creates a stable AnimationQueue instance that persists across renders
 * and subscribes to its changes using React's useSyncExternalStore.
 *
 * We get the benefit of synchronous updates while maintaining reactive state with this pattern.
 *
 */
export function useAnimationQueue<T>(
  customAddToQueue?: (queue: T[], newElem: T) => T[]
) {
  // Create queue instance once
  const [queue] = useState<AnimationQueue<T>>(
    () => new AnimationQueue<T>(customAddToQueue)
  );
  const currentElem = queue.getCurrent();

  const newCustomAddToQueueEvent = useEffectEvent(
    (newCustomAddToQueue?: (queue: T[], newElem: T) => T[]) => {
      queue.setCustomAddToQueue(newCustomAddToQueue);
    }
  );

  useEffect(() => {
    newCustomAddToQueueEvent(customAddToQueue);
  }, [customAddToQueue]);

  // Subscribe to changes for React re-renders
  useSyncExternalStore(
    (callback) => queue.subscribe(callback),
    () => queue.getSnapshot()
  );

  return { queue, currentElem };
}
