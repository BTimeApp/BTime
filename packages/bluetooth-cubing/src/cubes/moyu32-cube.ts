//moyu32-cube.ts
import { BluetoothCube } from "./cube";
import { CubeRegistry } from "./cube-registry";
import { findUUID, requestMACAddress } from "../utils";
import { AES128Cipher } from "../utils/aes128";
// import { valuedArray } from "../utils/math";
import LZString from "lz-string";

/**
 * Implementation of BluetoothCube spec for Moyu32 cubes.
 * Based on cstimer impl at https://github.com/cs0x7f/cstimer/blob/master/src/js/hardware/moyu32cube.js
 */

const MOYU32_CUBE_NAME_PREFIXES = ["WCU_MY3"];
const MOYU32_SERVICE_UUID = "0783b03e-7735-b5a0-1760-a305d2795cb0";
const MOYU32_READ_CHARACTERISTIC = "0783b03e-7735-b5a0-1760-a305d2795cb1";
const MOYU32_WRITE_CHARACTERISTIC = "0783b03e-7735-b5a0-1760-a305d2795cb2";

const ENCRYPTION_KEYS = [
  "NoJgjANGYJwQrADgjEUAMBmKAWCP4JNIRswt81Yp5DztE1EB2AXSA",
  "NoRg7ANAzArNAc1IigFgqgTB9MCcE8cAbBCJpKgeaSAAxTSPxgC6QA",
];

// CICs 0x(01..=FF)00
// const MOYU32_CIC_LIST = valuedArray(255, (i: number) => {
//   return (i + 1) << 8;
// });

class Moyu32Cube extends BluetoothCube {
  private readCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private deviceMac: string | null = null;
  private decoder: AES128Cipher | null = null;

  async setup(): Promise<void> {
    const deviceName = this.device.name!.trim();
    /**
     * Attempt automatic MAC discovery - in my experience, this doesn't work.
     * Leaving it out for now
     */
    // try {
    //   const mfData = await waitForAdvertisements(this.device);
    //   const dataView = this.getManufacturerDataBytes(mfData);
    //   this.deviceMac = await this.getMACAddressFromMfData(dataView);
    // } catch (error) {
    //   console.log("[Moyu32Cube] Advertisement discovery failed:", error);
    // }

    // set up primary service + characteristics
    this.server = await this.device.gatt!.connect();
    const timerService = await this.server.getPrimaryService(
      MOYU32_SERVICE_UUID
    );
    const timerServerCharacteristics = await timerService.getCharacteristics();

    this.readCharacteristic = findUUID(
      timerServerCharacteristics,
      MOYU32_READ_CHARACTERISTIC
    );
    this.writeCharacteristic = findUUID(
      timerServerCharacteristics,
      MOYU32_WRITE_CHARACTERISTIC
    );

    // cleanup
    // await this.readCharacteristic?.stopNotifications().catch(() => {});
    // this.readCharacteristic?.removeEventListener(
    //   "characteristicvaluechanged",
    //   this.handleReadChrEvent
    // );

    this.readCharacteristic?.addEventListener(
      "characteristicvaluechanged",
      this.handleReadChrEvent
    );

    await this.readCharacteristic?.startNotifications();

    this.initMac(deviceName, true, false);

    await this.requestCubeInfo();
    await this.requestCubeStatus();
    await this.requestCubePower();
  }

  async onDisconnect(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /** helpers */
  private getKeyAndIv(value: number[]) {
    const key = JSON.parse(
      LZString.decompressFromEncodedURIComponent(ENCRYPTION_KEYS[0])
    );
    const iv = JSON.parse(
      LZString.decompressFromEncodedURIComponent(ENCRYPTION_KEYS[1])
    );

    // XOR w/ upper MAC bytes, in reverse order according to spec
    for (let i = 0; i < 6; i++) {
      key[i] = (key[i] + value[5 - i]) % 255;
      iv[i] = (iv[i] + value[5 - i]) % 255;
    }

    return { key, iv };
  }

  private initDecoder(mac: string) {
    const value = [];
    for (let i = 0; i < 6; i++) {
      value.push(parseInt(mac.slice(i * 3, i * 3 + 2), 16));
    }
    const { key, iv } = this.getKeyAndIv(value);
    this.decoder = new AES128Cipher(key);
    this.decoder.iv = iv;
  }

  private decode(value: DataView) {
    const ret = [];
    for (let i = 0; i < value.byteLength; i++) {
      ret[i] = value.getUint8(i);
    }
    if (this.decoder == null) {
      return ret;
    }
    const iv = this.decoder.iv || [];
    if (ret.length > 16) {
      const offset = ret.length - 16;
      const block = this.decoder.decrypt(ret.slice(offset));
      for (let i = 0; i < 16; i++) {
        ret[i + offset] = block[i] ^ ~~iv[i];
      }
    }
    this.decoder.decrypt(ret);
    for (let i = 0; i < 16; i++) {
      ret[i] ^= ~~iv[i];
    }
    return ret;
  }

  private encode(ret: number[]) {
    if (this.decoder == null) {
      return ret;
    }
    const iv = this.decoder.iv || [];
    for (let i = 0; i < 16; i++) {
      ret[i] ^= ~~iv[i];
    }
    this.decoder.encrypt(ret);
    if (ret.length > 16) {
      const offset = ret.length - 16;
      const block = ret.slice(offset);
      for (let i = 0; i < 16; i++) {
        block[i] ^= ~~iv[i];
      }
      this.decoder.encrypt(block);
      for (let i = 0; i < 16; i++) {
        ret[i + offset] = block[i];
      }
    }
    return ret;
  }

  private async sendRequest(req: number[]): Promise<void> {
    if (!this.writeCharacteristic) {
      console.warn("[Moyu32Cube] sendRequest cannot find write chrct");
      return Promise.reject("No write characteristic on Moyu32Cube");
    }
    const encodedReq = this.encode(req.slice());
    console.log("[Moyu32Cube] SENDING REQUEST, encoded:", encodedReq);
    return this.writeCharacteristic
      .writeValue(new Uint8Array(encodedReq).buffer)
      .then(() => {
        console.log("[Moyu32Cube] REQUEST SENT SUCCESSFULLY");
      })
      .catch((error) => {
        console.error("[Moyu32Cube] REQUEST FAILED:", error);
        throw error;
      });
  }

  private sendSimpleRequest(opcode: number): Promise<void> {
    const req = Array(20).fill(0);
    req[0] = opcode;
    return this.sendRequest(req);
  }

  private requestCubeInfo() {
    return this.sendSimpleRequest(161);
  }

  private requestCubeStatus() {
    return this.sendSimpleRequest(163);
  }

  private requestCubePower() {
    return this.sendSimpleRequest(164);
  }

  /**
   * Both functions just used for automatic MAC discovery. Leaving out for now
   */
  //   private getManufacturerDataBytes(
  //     mfData: BluetoothManufacturerData | DataView
  //   ): DataView | undefined {
  //     if (mfData instanceof DataView) {
  //       // this is workaround for Bluefy browser
  //       return new DataView(mfData.buffer.slice(2));
  //     }
  //     for (const id of MOYU32_CIC_LIST) {
  //       if (mfData.has(id)) {
  //         return mfData.get(id);
  //       }
  //     }
  //     console.warn("[Moyu32Cube] Cube has new unknown CIC");
  //   }

  //   private getMACAddressFromMfData(dataView: DataView | undefined) {
  //     if (dataView && dataView.byteLength >= 6) {
  //       const mac = [];
  //       for (let i = 0; i < 6; i++) {
  //         mac.push(
  //           (dataView.getUint8(dataView.byteLength - i - 1) + 0x100)
  //             .toString(16)
  //             .slice(1)
  //         );
  //       }
  //       return Promise.resolve(mac.join(":"));
  //     }
  //     return Promise.reject(-3);
  //   }

  private initMac(
    deviceName: string,
    forcePrompt: boolean,
    isWrongKey: boolean
  ) {
    let defaultMac = null;
    if (/^WCU_MY32_[0-9A-F]{4}$/.exec(deviceName)) {
      defaultMac =
        "CF:30:16:00:" +
        deviceName.slice(9, 11) +
        ":" +
        deviceName.slice(11, 13);
    }
    this.deviceMac = requestMACAddress(
      deviceName,
      forcePrompt,
      isWrongKey,
      this.deviceMac,
      defaultMac
    );
    if (!this.deviceMac) {
      this.decoder = null;
      return;
    }
    this.initDecoder(this.deviceMac);
  }

  /**
   * Handles read characteristic events.
   */
  private handleReadChrEvent = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (this.decoder == null) {
      console.error(
        "[Moyu32Cube] trying to handle read event when decoder isn't setup properly!"
      );
      return;
    }
    if (value == null) {
      console.warn("[Moyu32Cube] reading null value from event");
      return;
    }

    //TODO implement stub
  };
}

CubeRegistry.register({
  namePrefixes: MOYU32_CUBE_NAME_PREFIXES,
  primaryServices: [MOYU32_SERVICE_UUID],
  factory: (device: BluetoothDevice) => new Moyu32Cube(device),
});
