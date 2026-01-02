/**
 * Side-effect imports: import each timer file here so that their register() calls run.
 * This pattern allows the library to be more extendable.
 * If you are planning to develop with this package, you can extend the timer registry
 * by adding TimerRegistry.register() calls in your files. Just make sure to import those
 * files somewhere before calling connectToTimer() so that your timers are registered.
 */

import "./gan-timer";
import "./qiyi-timer";
