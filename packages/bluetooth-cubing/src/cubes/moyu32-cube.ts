import type { MoveEvent } from "../types/cube-types";
import type { KPattern } from "cubing/kpuzzle";

import { BluetoothCube } from "./cube";
import { CubeRegistry } from "./cube-registry";
import { findUUID, requestMACAddress } from "../utils";
import { AES128Cipher } from "../utils/aes128";
import { get3x3KPuzzle } from "../utils/load-333";
import { Move } from "cubing/alg";
import LZString from "lz-string";

/**
 * Implementation of BluetoothCube spec for Moyu32 cubes.
 * Based on cstimer implementation at https://github.com/cs0x7f/cstimer/blob/master/src/js/hardware/moyu32cube.js
 */

const MOYU32_CUBE_NAME_PREFIXES = ["WCU_MY3"];
const MOYU32_SERVICE_UUID = "0783b03e-7735-b5a0-1760-a305d2795cb0";
const MOYU32_READ_CHARACTERISTIC = "0783b03e-7735-b5a0-1760-a305d2795cb1";
const MOYU32_WRITE_CHARACTERISTIC = "0783b03e-7735-b5a0-1760-a305d2795cb2";

const MOYU32_CUBE_INFO = 161;
const MOYU32_CUBE_STATUS = 163;
const MOYU32_CUBE_POWER = 164;

const MOYU32_CUBE_STATE = 163;
const MOYU32_CUBE_MOVE = 165;
// const MOYU32_CUBE_GYRO = 171;

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

  // private batteryLevel: number = 100;
  private initialState!: KPattern;
  private prevMoveSequenceNumber: number = -1;
  private initialStateInitialized: boolean = false;

  async setup(): Promise<void> {
    const deviceName = this.device.name!.trim();

    const kpuzzle333 = await get3x3KPuzzle();
    this.initialState = kpuzzle333.defaultPattern();

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
    await this.readCharacteristic?.stopNotifications().catch(() => {});
    this.readCharacteristic?.removeEventListener(
      "characteristicvaluechanged",
      this.handleReadChrEvent
    );

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
    return this.sendSimpleRequest(MOYU32_CUBE_INFO);
  }

  private requestCubeStatus() {
    return this.sendSimpleRequest(MOYU32_CUBE_STATUS);
  }

  private requestCubePower() {
    return this.sendSimpleRequest(MOYU32_CUBE_POWER);
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

    const timestamp = performance.now();
    const decodedValue = this.decode(value);

    const binaryParts: string[] = [];
    for (let i = 0; i < decodedValue.length; i++) {
      binaryParts[i] = (decodedValue[i] + 256).toString(2).slice(1);
    }
    const binaryString = binaryParts.join("");

    const msgType = parseInt(binaryString.slice(0, 8), 2);

    if (msgType === MOYU32_CUBE_INFO) {
      /**
       * Device info.
       * Only sends once per request.
       */
      let devName = "";
      for (let i = 0; i < 8; i++) {
        devName += String.fromCharCode(
          parseInt(binaryString.slice(8 + i * 8, 16 + i * 8), 2)
        );
      }

      const hardwareVersion = `${parseInt(
        binaryString.slice(88, 96),
        2
      )}.${parseInt(binaryString.slice(96, 104), 2)}`;
      const softwareVersion = `${parseInt(
        binaryString.slice(72, 80),
        2
      )}.${parseInt(binaryString.slice(80, 88), 2)}`;

      console.log("[Moyu32Cube] Hardware Version", hardwareVersion);
      console.log("[Moyu32Cube] Software Version", softwareVersion);
      console.log("[Moyu32Cube] Device Name", devName);
    } else if (msgType === MOYU32_CUBE_STATE) {
      /**
       * Full state info representable in 54 (48) facelets b/c it's strictly in WCA orientation.
       * Streams after being requested. We only read once on initial read and refresh when syncing.
       */
      if (!this.initialStateInitialized) {
        this.prevMoveSequenceNumber = parseInt(binaryString.slice(152, 160), 2);

        const initialStateFacelets = this.parseFacelet(
          binaryString.slice(8, 152)
        );
        console.log("latest cube state", initialStateFacelets);

        // TODO - turn the facelet representation into a kpattern and call processStateEvent
        this.initialStateInitialized = true;
      }
    } else if (msgType === MOYU32_CUBE_POWER) {
      /**
       * Battery level. Only sends once per request.
       */
      const batteryLevel = parseInt(binaryString.slice(8, 16), 2);
      console.log("[Moyu32Cube] Battery level:", batteryLevel);
    } else if (msgType === MOYU32_CUBE_MOVE) {
      /**
       * Move events.
       *
       * Info provided by cube:
       *  - most recent 5 moves performed (as a FIFO queue)
       *  - time offsets (ms) of those five moves since previous move. Maxes out at 65535
       *  - move sequence number of the current move event (mod 256).
       *
       * Moyu32cube will in general only send one move per move event.
       * One exception: a slice move with a 0 time offset will log BOTH moves in the same move event.
       * The move sequence number will be (prev event + 2) to reflect this.
       */

      // even if initial state isn't initialized, it's useful to track move sequence number so we know how many moves to process for the first event.
      const moveSequenceNumber = parseInt(binaryString.slice(88, 96), 2);

      // only start tracking moves after initial state initialized
      if (!this.initialStateInitialized) {
        this.prevMoveSequenceNumber = moveSequenceNumber;
        return;
      }

      const timeOffsets: number[] = [];
      const moves: string[] = [];
      let invalidMove = false;

      for (let i = 0; i < 5; i++) {
        const move = parseInt(binaryString.slice(96 + i * 5, 101 + i * 5), 2);
        timeOffsets[i] = parseInt(
          binaryString.slice(8 + i * 16, 24 + i * 16),
          2
        );
        moves[i] = "FBUDLR".charAt(move >> 1) + " '".charAt(move & 1);

        if (move >= 12) {
          moves[i] = "U ";
          invalidMove = true;
        }
      }

      if (invalidMove) {
        console.warn("invalid move detected!", moves);
      } else {
        // parse moves actually done, update sequence number, emit processMoveEvent, emit processStateEvent
        /**
         * To figure out which moves are done:
         *  - check moveSeqNum against prevMoveSeqNum.
         *    - if prevMoveSeqNum is -1, we can safely assume that this is the true first move since state initialization.
         *    - otherwise, we take moveSeqNum - prevMoveSeqNum and pray that it isn't > 5.
         */
        if (this.prevMoveSequenceNumber == -1) {
          this.processMoveEvent({
            move: new Move(moves[0]),
            timestamp: timestamp,
          });

          // if the first move has a 0 time offset, we need to process two events (slice move).
          if (timeOffsets[0] === 0) {
            this.processMoveEvent({
              move: new Move(moves[1]),
              timestamp: timestamp,
            });
          }
        } else {
          const numMovesToProcess =
            (moveSequenceNumber - this.prevMoveSequenceNumber) % 256;

          if (numMovesToProcess > 5) {
            // we can only process at most 5 moves at a time with the given moyu32 protocol.
            console.warn(
              "[Moyu32Cube] somehow has more than 5 moves to process. Resync your cube to ensure correct state tracking."
            );
            //TODO - figure out how to manually resync state from here. Move event/alg state may be lost.
          }

          const movesToProcess = Math.max(5, numMovesToProcess);

          let sum = 0;
          const timeOffsetPrefixSums = timeOffsets
            .slice(0, movesToProcess)
            .map((val) => (sum += val));
          timeOffsetPrefixSums.unshift(0); // the last move executed (idx 0) should always be synced with timestamp.

          for (let i = movesToProcess - 1; i >= 0; i--) {
            // unfortunately, time offset numbers max out at 65536 (ms), so if someone pauses for over 65.536s and we need to
            // process more than one move, we likely lose that data. fortunately, that should realistically never happen, so
            // we assume the latest move happened at timestamp and work backwards.
            this.processMoveEvent({
              move: new Move(moves[i]),
              timestamp: timestamp - timeOffsetPrefixSums[i],
            });
          }
        }

        console.log(
          "move seq number | moves | time offsets",
          moveSequenceNumber,
          moves,
          timeOffsets
        );

        this.prevMoveSequenceNumber = moveSequenceNumber;
      }
    }
    // else if (msgType === MOYU32_CUBE_GYRO) { // gyro
    //   // Handle gyro data if needed
    //   console.log(binaryString);
    // }
  };

  private parseFacelet(faceletBits: string) {
    /**
     * This representation is subject to change
     *
     * Returns a 54-character string, with 9 characters for each face (FBUDLR order)
     * in english reader order (left to right, top to bottom when held in canonical orientations)
     *
     * TODO convert to parse directly into a kpattern
     */

    const state = [];
    const faces = [2, 5, 0, 3, 4, 1]; // parse in order URFDLB instead of FBUDLR
    for (let i = 0; i < 6; i += 1) {
      const face = faceletBits.slice(faces[i] * 24, 24 + faces[i] * 24);
      for (let j = 0; j < 8; j += 1) {
        state.push("FBUDLR".charAt(parseInt(face.slice(j * 3, 3 + j * 3), 2)));
        if (j == 3) {
          state.push("FBUDLR".charAt(faces[i]));
        }
      }
    }
    return state.join("");
  }

  protected processMoveEvent(event: MoveEvent) {
    /**
     * Since we rely on initial state + moves to avoid state/move synchronization issues,
     * we need to push state events when we push move events.
     */

    super.processMoveEvent({
      move: event.move,
      timestamp: event.timestamp,
    });

    const newState = this.initialState.applyAlg(this.alg);
    this.processStateEvent({ kpattern: newState, timestamp: event.timestamp });
  }

  protected async onDisconnect(): Promise<void> {
    //TODO implement
    throw new Error("Method not implemented.");
  }
}

CubeRegistry.register({
  namePrefixes: MOYU32_CUBE_NAME_PREFIXES,
  primaryServices: [MOYU32_SERVICE_UUID],
  factory: (device: BluetoothDevice) => new Moyu32Cube(device),
});
