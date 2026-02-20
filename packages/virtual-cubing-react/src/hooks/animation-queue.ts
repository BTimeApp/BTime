/**
 * AnimationQueue - A synchronous store for managing animation state
 *
 * Provides immediate, synchronous access to queue state while still
 * integrating with React's rendering system.
 */
export class AnimationQueue<T> {
  private queue: T[] = [];
  private current: T | undefined = undefined;
  private listeners = new Set<() => void>();
  private version = 0; // For React change detection
  private customAddToQueue?: (queue: T[], newElem: T) => T[];

  constructor(customAddToQueue?: (queue: T[], newElem: T) => T[]) {
    this.customAddToQueue = customAddToQueue;
  }

  /**
   * Add an item to the queue and start processing if idle
   */
  enqueue(item: T): void {
    if (this.customAddToQueue) {
      // Use custom logic to add item (e.g., for deduplication, coalescing, etc.)
      this.queue = this.customAddToQueue(this.queue, item);
    } else {
      // Default: add to end
      this.queue.push(item);
    }
    this.tryProcessNext();
    this.notify();
  }

  /**
   * Mark current animation as complete and process next item
   */
  completeCurrent(): void {
    this.current = undefined;
    this.tryProcessNext();
  }

  /**
   * Clear all queued and current items (immediate cancellation)
   */
  clear(): void {
    this.queue = [];
    this.current = undefined;
    this.notify();
  }

  /**
   * Get the currently animating item (synchronous)
   */
  getCurrent(): T | undefined {
    return this.current;
  }

  /**
   * Get all items including current + queued (synchronous)
   */
  getAllItems(): T[] {
    return this.current ? [this.current, ...this.queue] : [...this.queue];
  }

  /**
   * Get only the queued items (not including current)
   */
  getQueuedItems(): T[] {
    return [...this.queue];
  }

  /**
   * Check if queue is completely empty (synchronous)
   */
  isEmpty(): boolean {
    return !this.current && this.queue.length === 0;
  }

  /**
   * Get queue length (not including current item)
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Update the custom add function (useful for reactive updates)
   */
  setCustomAddToQueue(
    customAddToQueue?: (queue: T[], newElem: T) => T[]
  ): void {
    this.customAddToQueue = customAddToQueue;
  }

  /**
   * Subscribe to changes (for React integration)
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get snapshot for React's useSyncExternalStore
   */
  getSnapshot(): number {
    return this.version;
  }

  private tryProcessNext(): void {
    if (!this.current && this.queue.length > 0) {
      this.current = this.queue.shift();
      this.notify();
    }
  }

  private notify(): void {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }
}
