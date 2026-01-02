import { BluetoothTimer } from "./timer";

interface TimerRegistryEntry {
  // all prefix this kind of timer can have
  namePrefixes: string[];
  // the service uuids needed for the timer
  primaryServices: BluetoothServiceUUID[];

  // provided connect, disconnect callbacks that the timer will automatically register
  factory: (device: BluetoothDevice) => BluetoothTimer;
}

export const TimerRegistry = {
  timerInfo: {} as Record<string, TimerRegistryEntry>,
  filters: [] as BluetoothLEScanFilter[],
  services: [] as BluetoothServiceUUID[],

  register(entry: TimerRegistryEntry): void {
    /**
     * To avoid namespace collisions, we will error out when we find a prefix conflict.
     * Since the register code gets called early, these issues should (and are meant to be) caught in dev.
     */
    entry.namePrefixes.forEach((prefix) => {
      if (prefix in this.timerInfo) {
        throw new Error(
          `[Bluetooth Timer Registry] Found a name prefix for bluetooth timers in register(): ${prefix}. Use a different prefix or none at all. If you need to use the same prefix for some reason, no you don't.`
        );
      }
      this.timerInfo[prefix] = entry;
      this.filters.push({
        namePrefix: prefix,
      });
    });

    this.services.push(...entry.primaryServices);
  },

  findTimer(
    device: BluetoothDevice
  ): ((device: BluetoothDevice) => BluetoothTimer) | null {
    //check for device existence and connect?

    for (const [namePrefix, registryEntry] of Object.entries(this.timerInfo)) {
      if (device.name?.startsWith(namePrefix)) {
        return registryEntry.factory;
      }
    }

    return null;
  },
};
