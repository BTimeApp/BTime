import type { BluetoothCube } from "./cube";

interface CubeRegistryEntry {
  // all prefix this kind of cube can have
  namePrefixes: string[];
  // the service uuids needed for the cube
  primaryServices: BluetoothServiceUUID[];

  // provided connect, disconnect callbacks that the cube will automatically register
  factory: (device: BluetoothDevice) => BluetoothCube;
}

export const CubeRegistry = {
  cubeInfo: {} as Record<string, CubeRegistryEntry>,
  filters: [] as BluetoothLEScanFilter[],
  services: [] as BluetoothServiceUUID[],

  register(entry: CubeRegistryEntry): void {
    /**
     * To avoid namespace collisions, we will error out when we find a prefix conflict.
     * Since the register code gets called early, these issues should (and are meant to be) caught in dev.
     */
    entry.namePrefixes.forEach((prefix) => {
      if (prefix in this.cubeInfo) {
        throw new Error(
          `[Bluetooth Cube Registry] Found a name prefix for bluetooth cube in register(): ${prefix}. Use a different prefix or none at all. If you need to use the same prefix for some reason, no you don't.`
        );
      }
      this.cubeInfo[prefix] = entry;
      this.filters.push({
        namePrefix: prefix,
      });
    });

    this.services.push(...entry.primaryServices);
  },

  findCube(
    device: BluetoothDevice
  ): ((device: BluetoothDevice) => BluetoothCube) | null {
    //check for device existence and connect?

    for (const [namePrefix, registryEntry] of Object.entries(this.cubeInfo)) {
      if (device.name?.startsWith(namePrefix)) {
        return registryEntry.factory;
      }
    }

    return null;
  },
};
