/**
 * From gan-web-bluetooth
 * Calculate ArrayBuffer checksum using CRC-16/CCIT-FALSE algorithm variation
 */
export function crc16ccit(data: Uint8Array): number {
  let crc = 0xffff;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;

    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }

  return crc & 0xffff;
}

const MAC_ADDR_MAP_KEY = "BLUETOOTH_CUBE_MAC_MAP";

export function requestMACAddress(
  deviceName: string,
  forcePrompt: boolean,
  isWrongKey: boolean,
  deviceMac: string | null,
  defaultMac: string | null
): string | null {
  // Load saved MACs from localStorage
  const savedMacMapStr = localStorage.getItem(MAC_ADDR_MAP_KEY) ?? "{}";
  const savedMacMap = JSON.parse(savedMacMapStr) as Record<string, string>;

  let mac: string | null = savedMacMap[deviceName];

  if (deviceMac) {
    // MAC was discovered automatically
    if (mac && mac.toUpperCase() === deviceMac.toUpperCase()) {
      console.log("[bluetooth util] device MAC matched");
    } else {
      mac = deviceMac;
    }
  } else {
    // No automatic discovery, ask user
    if (!mac || forcePrompt) {
      const message =
        (isWrongKey ? "The MAC provided might be wrong!\n" : "") +
        "Enter MAC address (xx:xx:xx:xx:xx:xx):\n" +
        "If you are using Chrome, you can find the MAC address at chrome://bluetooth-internals/#devices";

      mac = prompt(message, mac || defaultMac || "xx:xx:xx:xx:xx:xx");
    }

    // Validate MAC format
    const macRegex = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;
    if (!mac || !macRegex.test(mac)) {
      console.error("[bluetooth util] Invalid MAC address format");
      return null;
    }
  }

  // Save to localStorage if changed
  if (mac && mac !== savedMacMap[deviceName]) {
    savedMacMap[deviceName] = mac;
    localStorage.setItem(MAC_ADDR_MAP_KEY, JSON.stringify(savedMacMap));
  }

  return mac || null;
}

export function waitForAdvertisements(
  device?: BluetoothDevice
): Promise<BluetoothManufacturerData | DataView> {
  if (!device) {
    return Promise.reject(new Error("Device not available"));
  }

  const abortController = new AbortController();

  return new Promise((resolve, reject) => {
    const onAdvEvent = (event: BluetoothAdvertisingEvent) => {
      device?.removeEventListener("advertisementreceived", onAdvEvent);
      abortController.abort();
      resolve(event.manufacturerData);
    };

    device.addEventListener("advertisementreceived", onAdvEvent);

    device
      .watchAdvertisements({ signal: abortController.signal })
      .catch(reject);

    // Timeout after 10 seconds
    setTimeout(() => {
      device?.removeEventListener("advertisementreceived", onAdvEvent);
      abortController.abort();
      reject(new Error("Advertisement timeout"));
    }, 10000);
  });
}

export function toUuid128(uuid: string) {
  if (/^[0-9A-Fa-f]{4}$/.exec(uuid)) {
    uuid = "0000" + uuid + "-0000-1000-8000-00805F9B34FB";
  }
  return uuid.toUpperCase();
}

export function findUUID<
  T extends BluetoothRemoteGATTCharacteristic | BluetoothRemoteGATTService
>(elems: T[], uuid: string): T | null {
  uuid = toUuid128(uuid);
  for (const elem of elems) {
    if (toUuid128(elem.uuid) == uuid) {
      return elem;
    }
  }
  return null;
}
