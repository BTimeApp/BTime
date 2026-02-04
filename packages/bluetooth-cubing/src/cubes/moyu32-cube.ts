import type { MoveEvent, Quaternion } from "../types/cube-types";
import type { KPatternData, KPuzzle } from "cubing/kpuzzle";

import { BluetoothCube } from "./cube";
import { CubeRegistry } from "./cube-registry";
import { findUUID, normalizeQuaternion, requestMACAddress } from "../utils";
import { AES128Cipher } from "../utils/aes128";
import { get3x3KPuzzle } from "../utils/load-333";
import { Alg, Move } from "cubing/alg";
import { KPattern } from "cubing/kpuzzle";
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
const MOYU32_CUBE_GYRO = 171;

const ENCRYPTION_KEYS = [
  "NoJgjANGYJwQrADgjEUAMBmKAWCP4JNIRswt81Yp5DztE1EB2AXSA",
  "NoRg7ANAzArNAc1IigFgqgTB9MCcE8cAbBCJpKgeaSAAxTSPxgC6QA",
];

// CICs 0x(01..=FF)00
// const MOYU32_CIC_LIST = valuedArray(255, (i: number) => {
//   return (i + 1) << 8;
// });

/** Helper types for Edges and Corners as defined by Moyu32. If other protocols use these definitions, consider moving them to /types */

/**
 * Types for edge facelet
 */
type EdgeFacelet = [number, number];
type CornerFacelet = [number, number, number];

type PieceData = { id: number; orientation: number };

//canonical order (same as piece id order): UF, UR, UB, UL, DF, DR, DB, DL, FR, FL, BR, BL

/**
 * Each face (FBUDLR) has 24 bits, each facelet (non-center, reading-order) has 3 bits
 * edges can be identified 2 offsets for the starting bits of each facelet.
 * for example,
 *    UF would be
 *    face 2 facelet 7 [24*2 + (7 * 3), 24*2 + ((7 + 1) * 3)) and
 *    face 0 facelet 2 [2 * 3, ((2 + 1) * 3))
 *
 * For simplicity, we store only the starting bit index K. The end is always K + 3.
 */
const EDGE_FACELET_BIT_ORDER: EdgeFacelet[] = [
  [24 * 2 + 6 * 3, 24 * 0 + 1 * 3], //UF
  [24 * 2 + 4 * 3, 24 * 5 + 1 * 3], //UR
  [24 * 2 + 1 * 3, 24 * 1 + 1 * 3], //UB
  [24 * 2 + 3 * 3, 24 * 4 + 1 * 3], //UL
  [24 * 3 + 1 * 3, 24 * 0 + 6 * 3], //DF
  [24 * 3 + 4 * 3, 24 * 5 + 6 * 3], //DR
  [24 * 3 + 6 * 3, 24 * 1 + 6 * 3], //DB
  [24 * 3 + 3 * 3, 24 * 4 + 6 * 3], //DL
  [24 * 0 + 4 * 3, 24 * 5 + 3 * 3], //FR
  [24 * 0 + 3 * 3, 24 * 4 + 4 * 3], //FL
  [24 * 1 + 3 * 3, 24 * 5 + 4 * 3], //BR
  [24 * 1 + 4 * 3, 24 * 4 + 3 * 3], //BL
];

const EDGE_FACELET_PIECEDATA_MAPPING: Map<string, PieceData> = new Map<
  string,
  PieceData
>([
  ["UF", { id: 0, orientation: 0 }],
  ["FU", { id: 0, orientation: 1 }],

  ["UR", { id: 1, orientation: 0 }],
  ["RU", { id: 1, orientation: 1 }],

  ["UB", { id: 2, orientation: 0 }],
  ["BU", { id: 2, orientation: 1 }],

  ["UL", { id: 3, orientation: 0 }],
  ["LU", { id: 3, orientation: 1 }],

  ["DF", { id: 4, orientation: 0 }],
  ["FD", { id: 4, orientation: 1 }],

  ["DR", { id: 5, orientation: 0 }],
  ["RD", { id: 5, orientation: 1 }],

  ["DB", { id: 6, orientation: 0 }],
  ["BD", { id: 6, orientation: 1 }],

  ["DL", { id: 7, orientation: 0 }],
  ["LD", { id: 7, orientation: 1 }],

  ["FR", { id: 8, orientation: 0 }],
  ["RF", { id: 8, orientation: 1 }],

  ["FL", { id: 9, orientation: 0 }],
  ["LF", { id: 9, orientation: 1 }],

  ["BR", { id: 10, orientation: 0 }],
  ["RB", { id: 10, orientation: 1 }],

  ["BL", { id: 11, orientation: 0 }],
  ["LB", { id: 11, orientation: 1 }],
]);

//FBUDLR
// URF, UBR, ULB, UFL, DFR, DLF, DBL, DRB
const CORNER_FACELET_BIT_ORDER: CornerFacelet[] = [
  [24 * 2 + 7 * 3, 24 * 5 + 0 * 3, 24 * 0 + 2 * 3], //URF
  [24 * 2 + 2 * 3, 24 * 1 + 0 * 3, 24 * 5 + 2 * 3], //UBR
  [24 * 2 + 0 * 3, 24 * 4 + 0 * 3, 24 * 1 + 2 * 3], //ULB
  [24 * 2 + 5 * 3, 24 * 0 + 0 * 3, 24 * 4 + 2 * 3], //UFL
  [24 * 3 + 2 * 3, 24 * 0 + 7 * 3, 24 * 5 + 5 * 3], //DFR
  [24 * 3 + 0 * 3, 24 * 4 + 7 * 3, 24 * 0 + 5 * 3], //DLF
  [24 * 3 + 5 * 3, 24 * 1 + 7 * 3, 24 * 4 + 5 * 3], //DBL
  [24 * 3 + 7 * 3, 24 * 5 + 7 * 3, 24 * 1 + 5 * 3], //DRB
];

const CORNER_FACELET_PIECEDATA_MAPPING: Map<string, PieceData> = new Map<
  string,
  PieceData
>([
  ["URF", { id: 0, orientation: 0 }],
  ["FUR", { id: 0, orientation: 1 }],
  ["RFU", { id: 0, orientation: 2 }],

  ["UBR", { id: 1, orientation: 0 }],
  ["RUB", { id: 1, orientation: 1 }],
  ["BRU", { id: 1, orientation: 2 }],

  ["ULB", { id: 2, orientation: 0 }],
  ["BUL", { id: 2, orientation: 1 }],
  ["LBU", { id: 2, orientation: 2 }],

  ["UFL", { id: 3, orientation: 0 }],
  ["LUF", { id: 3, orientation: 1 }],
  ["FLU", { id: 3, orientation: 2 }],

  ["DFR", { id: 4, orientation: 0 }],
  ["RDF", { id: 4, orientation: 1 }],
  ["FRD", { id: 4, orientation: 2 }],

  ["DLF", { id: 5, orientation: 0 }],
  ["FDL", { id: 5, orientation: 1 }],
  ["LFD", { id: 5, orientation: 2 }],

  ["DBL", { id: 6, orientation: 0 }],
  ["LDB", { id: 6, orientation: 1 }],
  ["BLD", { id: 6, orientation: 2 }],

  ["DRB", { id: 7, orientation: 0 }],
  ["BDR", { id: 7, orientation: 1 }],
  ["RBD", { id: 7, orientation: 2 }],
]);

class Moyu32Cube extends BluetoothCube {
  private readCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private deviceMac: string | null = null;
  private decoder: AES128Cipher | null = null;

  // private batteryLevel: number = 100;
  private kpuzzle!: KPuzzle; //since fetching the 3x3 kpuzzle is async, we'll handle this in setup
  private prevMoveSequenceNumber: number = -1;

  async setup(): Promise<void> {
    const deviceName = this.device.name!.trim();

    this.kpuzzle = await get3x3KPuzzle();

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
    await this.refreshReadCharacteristic();

    this.initMac(deviceName, true, false);

    await this.sendCubeRequests();
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
    return this.writeCharacteristic
      .writeValue(new Uint8Array(encodedReq).buffer)
      .then(() => {})
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

  private async refreshReadCharacteristic(): Promise<void> {
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
  }

  private async sendCubeRequests(): Promise<void> {
    await this.requestCubeInfo();
    await this.requestCubeStatus();
    await this.requestCubePower();
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
       * Only sends a single message when requested. We only read once on initial read and refresh when syncing.
       */
      this.prevMoveSequenceNumber = parseInt(binaryString.slice(152, 160), 2);

      const stateData: KPatternData = this.parseState(
        binaryString.slice(8, 152)
      );

      // this.initializeState(new KPattern(this.kpuzzle, initialStateData));
      this.processStateEvent({
        kpattern: new KPattern(this.kpuzzle, stateData),
        timestamp: timestamp,
      });
      // }
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

      const moveSequenceNumber = parseInt(binaryString.slice(88, 96), 2);

      const timeOffsets: number[] = [];
      const moves: string[] = [];
      let invalidMove = false;

      for (let i = 0; i < 5; i++) {
        const move = parseInt(binaryString.slice(96 + i * 5, 101 + i * 5), 2);
        timeOffsets[i] = parseInt(
          binaryString.slice(8 + i * 16, 24 + i * 16),
          2
        );
        moves[i] = "FBUDLR".charAt(move >> 1) + (move & 1 ? "'" : "");

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
          // if the first move has a 0 time offset, we need to process two events (slice move).
          if (timeOffsets[0] === 0) {
            this.processMoveEvent({
              move: new Move(moves[1]),
              timestamp: timestamp,
              duration: timeOffsets[1] < 200 ? timeOffsets[1] : undefined,
            });
          }

          this.processMoveEvent({
            move: new Move(moves[0]),
            timestamp: timestamp,
            duration: timeOffsets[0] < 200 ? timeOffsets[0] : undefined,
          });
        } else {
          const numMovesToProcess =
            (moveSequenceNumber - this.prevMoveSequenceNumber) & 0xff;

          if (numMovesToProcess > moves.length) {
            // we can only process at most 5 moves at a time with the given moyu32 protocol.
            console.warn(
              `[Moyu32Cube] somehow has more than ${moves.length} moves to process. Resync your cube to ensure correct state tracking.`
            );
            //TODO - figure out how to manually resync state from here. Move event/alg state may be lost.
          }

          const movesToProcess = Math.min(5, numMovesToProcess);

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
              duration:
                timeOffsetPrefixSums[i] < 200
                  ? timeOffsetPrefixSums[i]
                  : undefined,
            });
          }
        }

        this.prevMoveSequenceNumber = moveSequenceNumber;
      }
    } else if (msgType === MOYU32_CUBE_GYRO) {
      // Gyro data - see parseOrientation for explanation
      const orientation = this.parseOrientation(binaryString);
      const canonicalOrientation = this.convertOrientation(orientation);

      this.processOrientationEvent({
        quaternion: canonicalOrientation,
        timestamp: timestamp,
      });
    }
  };

  private parseState(faceletBits: string): KPatternData {
    /**
     * Parses bitstring state representation directly to kpattern
     *
     * Per [edge, corner] piece type:
     * iterate over the positions in index order (cubing.js).
     *  - get the corresponding facelet bits in orientation order
     *  - call a helper parsing function to get: (1) the correct piece ID and (2) the orientation
     *
     * This will let us reconstruct the KPatternData correctly, which we can create a KPattern with
     */

    const newState: KPatternData = {
      EDGES: {
        pieces: [],
        orientation: [],
      },
      CORNERS: {
        pieces: [],
        orientation: [],
      },
      CENTERS: {
        pieces: [0, 1, 2, 3, 4, 5],
        orientation: [0, 0, 0, 0, 0, 0],
        orientationMod: [1, 1, 1, 1, 1, 1],
      },
    };

    //TODO: inline
    for (let i = 0; i < 12; i++) {
      const pieceString = EDGE_FACELET_BIT_ORDER[i]
        .map((x) => "FBUDLR".charAt(parseInt(faceletBits.slice(x, x + 3), 2)))
        .join("");
      const pieceData = EDGE_FACELET_PIECEDATA_MAPPING.get(pieceString)!;
      newState.EDGES.pieces.push(pieceData.id);
      newState.EDGES.orientation.push(pieceData.orientation);
    }
    for (let i = 0; i < 8; i++) {
      const pieceString = CORNER_FACELET_BIT_ORDER[i]
        .map((x) => "FBUDLR".charAt(parseInt(faceletBits.slice(x, x + 3), 2)))
        .join("");
      const pieceData = CORNER_FACELET_PIECEDATA_MAPPING.get(pieceString)!;
      newState.CORNERS.pieces.push(pieceData.id);
      newState.CORNERS.orientation.push(pieceData.orientation);
    }

    return newState;
  }

  private static parseSignedInt32(binaryString: string): number {
    // Split into 4 bytes (8 bits each)
    const byte0 = parseInt(binaryString.slice(0, 8), 2);
    const byte1 = parseInt(binaryString.slice(8, 16), 2);
    const byte2 = parseInt(binaryString.slice(16, 24), 2);
    const byte3 = parseInt(binaryString.slice(24, 32), 2);

    // Reconstruct as little-endian: byte0 is LSB, byte3 is MSB
    const unsigned = byte0 | (byte1 << 8) | (byte2 << 16) | (byte3 << 24);

    // Convert to signed
    return unsigned >= 0x80000000 ? unsigned - 0x100000000 : unsigned;
  }

  private parseOrientation(binaryString: string): Quaternion {
    /**
     * After testing with the Moyu32Cube protocol, we found:
     *
     * Each orientation message is 160 bits long. The first 8 bits are for event type (171, gyro data)
     * bits [8, 39] - quat W
     * bits [40, 71] - quat X
     * bits [72, 103] - quat Y
     * bits [104, 135] - quat Z
     * bits [136, 159] - final 24 bits are always 0 (reserved for padding)
     *
     * Each quaternion is scaled up to 2^30. To reduce to a normalized quaternion, divide all parts by 2^30.
     *
     * The cube appears to not have a single global orientation. Instead, orientation is only defined up to a global "up" axis.
     *
     * For example, when initializing connection with the cube in ANY orientation where the white face points up, we get a (1, 0, 0, 0) wxyz quaternion, representing the identity rotation matrix.
     * As a result, this protocol will force any library author that uses this orientation in a meaningful way to "sync" their orientation events with a canonical orientation that the user holds the cube in.
     *
     * NOTE: Moyu32Cube protocol appears to assign x right, y back, z up. This should be transformed to use the global reference frame x right, y up, z front.
     *
     * Thanks to @hppeng for helping test
     */

    const QUAT_SCALE = 1 / (1 << 30);

    const w =
      Moyu32Cube.parseSignedInt32(binaryString.slice(8, 40)) * QUAT_SCALE;
    const x =
      Moyu32Cube.parseSignedInt32(binaryString.slice(40, 72)) * QUAT_SCALE;
    const y =
      Moyu32Cube.parseSignedInt32(binaryString.slice(72, 104)) * QUAT_SCALE;
    const z =
      Moyu32Cube.parseSignedInt32(binaryString.slice(104, 136)) * QUAT_SCALE;

    return normalizeQuaternion({
      w: w,
      x: x,
      y: y,
      z: z,
    });
  }

  private convertOrientation(orientation: Quaternion): Quaternion {
    /**
     * Converts orientation (x right, y back, z up) to the canonical (x right, y up, z front).
     * This maps to a pi/2 rotation about the x axis. Luckily, this is an easy transformation for quaternions.
     */
    const { w, x, y, z } = orientation;
    return {
      w: w,
      x: x,
      y: z,
      z: -y,
    };
  }

  protected async onSync() {
    this.prevMoveSequenceNumber = -1;

    this.refreshReadCharacteristic();
    this.sendCubeRequests();
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

    const newState = this.state!.applyAlg(new Alg([event.move]));
    this.processStateEvent({ kpattern: newState, timestamp: event.timestamp });
  }

  protected async onDisconnect(): Promise<void> {
    this.readCharacteristic?.removeEventListener(
      "characteristicvaluechanged",
      this.handleReadChrEvent
    );
    await this.readCharacteristic?.stopNotifications().catch(() => {});
  }
}

CubeRegistry.register({
  namePrefixes: MOYU32_CUBE_NAME_PREFIXES,
  primaryServices: [MOYU32_SERVICE_UUID],
  factory: (device: BluetoothDevice) => new Moyu32Cube(device),
});
