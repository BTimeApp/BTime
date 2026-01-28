//index.ts
import type { BluetoothCube } from "./cube";

import { CubeRegistry } from "./cube-registry";
import "./register-cubes"; //register all cubes
export * from "./cube";

export async function connectCube(): Promise<BluetoothCube> {
  const device = await navigator.bluetooth.requestDevice({
    filters: CubeRegistry.filters,
    optionalServices: CubeRegistry.services,
  });

  const cubeFactory = CubeRegistry.findCube(device);
  if (!cubeFactory) {
    throw new Error(`The connected device is not a valid cube.`);
  }

  const cube = cubeFactory(device);

  /**
   * We separate construction and proper initialization.
   * Do anything post-construction, pre-initialization here.
   */

  try {
    await cube.init();
    return cube;
  } catch (err) {
    throw new Error(
      `Failed to set up bluetooth timer: ${(err as Error).message}`
    );
  }
}
