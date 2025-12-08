import { SmartTimer } from "./timer";
import { TimerRegistry } from "./timer-registry";
import "./register-timers"; //register all timers
export * from "./timer";

export async function connectTimer(): Promise<SmartTimer> {
  const device = await navigator.bluetooth.requestDevice({
    filters: TimerRegistry.filters,
    optionalServices: TimerRegistry.services,
  });

  const timerFactory = TimerRegistry.findTimer(device);
  if (!timerFactory) {
    throw new Error(`The connected device is not a valid timer`);
  }

  const timer = timerFactory(device);

  /**
   * We separate construction and proper initialization.
   * Do anything post-construction, pre-initialization here.
   */

  try {
    await timer.init();
    return timer;
  } catch (err) {
    throw new Error(
      `Failed to set up bluetooth timer: ${(err as Error).message}`
    );
  }
}