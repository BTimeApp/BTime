/**
 * Side-effect imports: import each timer file here so that their register() calls run.
 * This pattern allows the library to be more extendable.
 * If you are planning to develop with this package, you can extend the cube registry
 * by adding CubeRegistry.register() calls in your files. Just make sure to import those
 * files somewhere before calling connectToCube() so that your cubes are registered.
 */

import "./moyu32-cube";
import "./gan-cube";
