import type { MoveEvent } from "../types/cube-types";
import type { KPatternData, KPuzzle } from "cubing/kpuzzle";

import { BluetoothCube } from "./cube";
import { CubeRegistry } from "./cube-registry";
import {
  CORNER_FACELET_PIECEDATA_MAPPING_333,
  EDGE_FACELET_PIECEDATA_MAPPING_333,
  type PieceData,
} from "../types/facelet";
import {
  findUUID,
  // invertQuaternion,
  // normalizeQuaternion,
  // applyQuaternion,
  requestMACAddress,
} from "../utils";
import { AES128Cipher } from "../utils/aes128";
import { get3x3KPuzzle } from "../utils/load-333";
import { Alg, Move } from "cubing/alg";
import { KPattern } from "cubing/kpuzzle";
import LZString from "lz-string";

/**
 * Implementation of BluetoothCube spec for GAN smart cubes.
 *
 * Supports protocol versions V2, V3, and V4. V1 (polling-based) is not supported.
 *
 * Note: although implemented, V3 and V4 are completely untested since I don't have cubes with those protocols.
 *
 * Based on cstimer implementation at https://github.com/cs0x7f/cstimer/blob/master/src/js/hardware/gancube.js
 */

const GAN_CUBE_NAME_PREFIXES = ["GAN", "MG", "AiCube"];

const SERVICE_UUID_V2 = "6e400001-b5a3-f393-e0a9-e50e24dc4179";
const CHRCT_UUID_V2READ = "28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4";
const CHRCT_UUID_V2WRITE = "28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4";
const SERVICE_UUID_V3 = "8653000a-43e6-47b7-9cb0-5fc21d4ae340";
const CHRCT_UUID_V3READ = "8653000b-43e6-47b7-9cb0-5fc21d4ae340";
const CHRCT_UUID_V3WRITE = "8653000c-43e6-47b7-9cb0-5fc21d4ae340";
const SERVICE_UUID_V4 = "00000010-0000-fff7-fff6-fff5fff4fff0";
const CHRCT_UUID_V4READ = "0000fff6-0000-1000-8000-00805f9b34fb";
const CHRCT_UUID_V4WRITE = "0000fff5-0000-1000-8000-00805f9b34fb";

// Encryption keys for aes128. The same as cstimer's KEYS[2..5] (dropping the first 2 keys since those are for v1)
//   [0] = KEYS[2]  ver0 key
//   [1] = KEYS[3]  ver0 IV
//   [2] = KEYS[4]  ver1 key  (AiCube)
//   [3] = KEYS[5]  ver1 IV   (AiCube)
const ENCRYPTION_KEYS = [
  "NoRgNATGBs1gLABgQTjCeBWSUDsYBmKbCeMADjNnXxHIoIF0g",
  "NoRg7ANAzBCsAMEAsioxBEIAc0Cc0ATJkgSIYhXIjhMQGxgC6QA",
  "NoVgNAjAHGBMYDYCcdJgCwTFBkYVgAY9JpJYUsYBmAXSA",
  "NoRgNAbAHGAsAMkwgMyzClH0LFcArHnAJzIqIBMGWEAukA",
];

type GanProtocolVersion = "v2" | "v3" | "v4";

// used in v3/v4 protocols
interface MoveBufferEntry {
  moveCnt: number;
  move: string; // e.g. "U ", "R'", "F2"
  deviceTimestamp: number | null;
  localTimestamp: number | null;
}

// gan corner names, in order and in orientation.
const GAN_CORNER_NAMES = [
  "URF",
  "UFL",
  "ULB",
  "UBR",
  "DFR",
  "DLF",
  "DBL",
  "DRB",
];
/**
 * the GAN corner order differs from BTime's corner order.
 * kpattern corner order - UFR UBR UBL UFL DFR DFL DBL DBR
 * gan corner order (with orientation) - URF UFL ULB UBR DFR DLF DBL DRB
 * since we have to iterate over the pieces in gan order (due to checksum shenanigans),
 * we use this array to translate from GAN order to btime order
 */
const GAN_TO_BTIME_CORNER_ORDER = [0, 3, 2, 1, 4, 5, 6, 7];

const GAN_EDGE_NAMES = [
  "UR",
  "UF",
  "UL",
  "UB",
  "DR",
  "DF",
  "DL",
  "DB",
  "FR",
  "FL",
  "BL",
  "BR",
];

/**
 * the GAN corner order differs from BTime's corner order.
 * kpattern corner order - UF UR UB UL DF DR DB DL FR FL BR BL
 * gan edge order (with orientation) - UR UF UL UB DR DF DL DB FR FL BL BR
 * since we have to iterate over the pieces in gan order (due to checksum shenanigans),
 * we use this array to translate from GAN order to btime order
 */
const GAN_TO_BTIME_EDGE_ORDER = [1, 0, 3, 2, 5, 4, 7, 6, 8, 9, 11, 10];

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------

class GanCube extends BluetoothCube {
  private readCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private deviceMac: string | null = null;
  private decoder: AES128Cipher | null = null;
  private protocolVersion: GanProtocolVersion | null = null;
  private kpuzzle!: KPuzzle;

  // Move tracking
  private prevMoveSequenceNumber: number = -1;
  private moveBuffer: MoveBufferEntry[] = [];

  // Device timing (V2 only)
  private deviceTime: number = 0;
  private deviceTimeOffset: number = 0;

  // Gyro reference frame transform (GAN: x right, y up, z back → BTime: x right, y up, z front)
  // static readonly GAN_TO_BTIME_FRAME_TRANSFORM: Quaternion = {
  //   w: 0,
  //   x: 0,
  //   y: 1,
  //   z: 0,
  // };

  // static readonly GAN_TO_BTIME_FRAME_TRANSFORM_INVERSE: Quaternion =
  //   invertQuaternion(GanCube.GAN_TO_BTIME_FRAME_TRANSFORM);

  async setup(): Promise<void> {
    const deviceName = this.device.name!.trim();

    this.kpuzzle = await get3x3KPuzzle();

    this.server = await this.device.gatt!.connect();
    const services = await this.server.getPrimaryServices();

    // Detect protocol version by service UUID presence (V2 > V3 > V4 priority)
    const serviceV2 = findUUID(services, SERVICE_UUID_V2);
    const serviceV3 = findUUID(services, SERVICE_UUID_V3);
    const serviceV4 = findUUID(services, SERVICE_UUID_V4);

    let targetService: BluetoothRemoteGATTService;
    let readUUID: string;
    let writeUUID: string;

    if (serviceV2) {
      this.protocolVersion = "v2";
      targetService = serviceV2;
      readUUID = CHRCT_UUID_V2READ;
      writeUUID = CHRCT_UUID_V2WRITE;
    } else if (serviceV3) {
      this.protocolVersion = "v3";
      targetService = serviceV3;
      readUUID = CHRCT_UUID_V3READ;
      writeUUID = CHRCT_UUID_V3WRITE;
    } else if (serviceV4) {
      this.protocolVersion = "v4";
      targetService = serviceV4;
      readUUID = CHRCT_UUID_V4READ;
      writeUUID = CHRCT_UUID_V4WRITE;
    } else {
      throw new Error(
        "[GanCube] No supported GAN BLE service found on this device."
      );
    }

    const characteristics = await targetService.getCharacteristics();
    this.readCharacteristic = findUUID(characteristics, readUUID);
    this.writeCharacteristic = findUUID(characteristics, writeUUID);

    if (!this.readCharacteristic || !this.writeCharacteristic) {
      throw new Error(
        `[GanCube] Could not find read/write characteristics for ${this.protocolVersion}`
      );
    }

    this.initMac(deviceName, true, false);

    await this.refreshReadCharacteristic();
    await this.sendInitialRequests();
  }

  /**
   * Derives AES key and IV from the cube's MAC address, per the GAN V2+ spec.
   * The base key/IV are hardcoded (LZString-compressed), then each of the first
   * 6 bytes is offset by the corresponding (reversed) MAC byte.
   */
  private getKeyAndIv(macBytes: number[], ver: number = 0) {
    // ver 0 = standard GAN (KEYS[2], KEYS[3]), ver 1 = AiCube (KEYS[4], KEYS[5])
    const key = JSON.parse(
      LZString.decompressFromEncodedURIComponent(ENCRYPTION_KEYS[0 + ver * 2])
    ) as number[];
    const iv = JSON.parse(
      LZString.decompressFromEncodedURIComponent(ENCRYPTION_KEYS[1 + ver * 2])
    ) as number[];

    for (let i = 0; i < 6; i++) {
      key[i] = (key[i] + macBytes[5 - i]) % 255;
      iv[i] = (iv[i] + macBytes[5 - i]) % 255;
    }

    return { key, iv };
  }

  private initDecoder(mac: string, ver: number = 0): void {
    const macBytes: number[] = [];
    for (let i = 0; i < 6; i++) {
      macBytes.push(parseInt(mac.slice(i * 3, i * 3 + 2), 16));
    }
    const { key, iv } = this.getKeyAndIv(macBytes, ver);
    this.decoder = new AES128Cipher(key);
    this.decoder.iv = iv;
  }

  private initMac(
    deviceName: string,
    forcePrompt: boolean,
    isWrongKey: boolean
  ): void {
    const ver = deviceName.startsWith("AiCube") ? 1 : 0;
    this.deviceMac = requestMACAddress(
      deviceName,
      forcePrompt,
      isWrongKey,
      this.deviceMac,
      null
    );
    if (!this.deviceMac) {
      this.decoder = null;
      return;
    }
    this.initDecoder(this.deviceMac, ver);
  }

  private decode(value: DataView): number[] {
    const ret: number[] = [];
    for (let i = 0; i < value.byteLength; i++) {
      ret[i] = value.getUint8(i);
    }
    if (this.decoder == null) return ret;

    const iv = (this.decoder.iv as number[]) || [];
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

  private encode(ret: number[]): number[] {
    if (this.decoder == null) return ret;

    const iv = (this.decoder.iv as number[]) || [];
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
      console.warn("[GanCube] sendRequest: no write characteristic");
      return;
    }
    const encoded = this.encode(req.slice());
    await this.writeCharacteristic
      .writeValue(new Uint8Array(encoded).buffer)
      .catch((err) => console.error("[GanCube] write failed:", err));
  }

  // --- V2 requests (20-byte, opcode in byte 0) ---

  private sendV2SimpleRequest(opcode: number): Promise<void> {
    const req = new Array<number>(20).fill(0);
    req[0] = opcode;
    return this.sendRequest(req);
  }

  private requestV2Facelets() {
    return this.sendV2SimpleRequest(4);
  }
  private requestV2Battery() {
    return this.sendV2SimpleRequest(9);
  }
  private requestV2HwInfo() {
    return this.sendV2SimpleRequest(5);
  }

  // --- V3 requests (16-byte, magic 0x68 in byte 0, opcode in byte 1) ---

  private sendV3SimpleRequest(opcode: number): Promise<void> {
    const req = new Array<number>(16).fill(0);
    req[0] = 0x68;
    req[1] = opcode;
    return this.sendRequest(req);
  }

  private requestV3Facelets() {
    return this.sendV3SimpleRequest(1);
  }
  private requestV3Battery() {
    return this.sendV3SimpleRequest(7);
  }
  private requestV3HwInfo() {
    return this.sendV3SimpleRequest(4);
  }

  // --- V4 requests ---

  private sendV4Request(req: number[]): Promise<void> {
    return this.sendRequest(req);
  }

  private requestV4Facelets(): Promise<void> {
    const req = new Array<number>(20).fill(0);
    req[0] = 0xdd;
    req[1] = 0x04;
    req[3] = 0xed;
    return this.sendV4Request(req);
  }

  private requestV4Battery(): Promise<void> {
    const req = new Array<number>(20).fill(0);
    req[0] = 0xdd;
    req[1] = 0x04;
    req[3] = 0xef;
    return this.sendV4Request(req);
  }

  private requestV4HwInfo(): Promise<void> {
    const req = new Array<number>(20).fill(0);
    req[0] = 0xdf;
    req[1] = 0x03;
    return this.sendV4Request(req);
  }

  // --- Move history (V3/V4 only, for loss recovery) ---

  private requestMoveHistory(
    startMoveCnt: number,
    numberOfMoves: number
  ): void {
    // Align to odd serial, even move count (firmware requirement)
    if (startMoveCnt % 2 === 0) startMoveCnt = (startMoveCnt - 1) & 0xff;
    if (numberOfMoves % 2 === 1) numberOfMoves++;
    // Firmware bug: never cross the 255->0 boundary
    numberOfMoves = Math.min(numberOfMoves, startMoveCnt + 1);

    let req: number[];
    if (this.protocolVersion === "v3") {
      req = new Array<number>(16).fill(0);
      req[0] = 0x68;
      req[1] = 0x03;
    } else if (this.protocolVersion === "v4") {
      req = new Array<number>(20).fill(0);
      req[0] = 0xd1;
      req[1] = 0x04;
    } else {
      return;
    }
    req[2] = startMoveCnt;
    req[3] = 0;
    req[4] = numberOfMoves;
    req[5] = 0;

    const encoded = this.encode(req.slice());
    this.writeCharacteristic
      ?.writeValue(new Uint8Array(encoded).buffer)
      .catch(() => {}); // suppress — retried automatically on next move event
  }

  // ---------------------------------------------------------------------------
  // Notification setup
  // ---------------------------------------------------------------------------

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

  private async sendInitialRequests(): Promise<void> {
    if (this.protocolVersion === "v2") {
      await this.requestV2HwInfo();
      await this.requestV2Facelets();
      await this.requestV2Battery();
    } else if (this.protocolVersion === "v3") {
      await this.requestV3HwInfo();
      await this.requestV3Facelets();
      await this.requestV3Battery();
    } else if (this.protocolVersion === "v4") {
      await this.requestV4HwInfo();
      await this.requestV4Facelets();
      await this.requestV4Battery();
    }
  }

  private handleReadChrEvent = (event: Event): void => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value || !this.decoder) {
      console.warn("[GanCube] Received event before decoder is ready.");
      return;
    }
    const decoded = this.decode(value);

    if (this.protocolVersion === "v2") {
      this.parseV2Data(decoded);
    } else if (this.protocolVersion === "v3") {
      this.parseV3Data(decoded);
    } else if (this.protocolVersion === "v4") {
      this.parseV4Data(decoded);
    }
  };

  private static toBitString(bytes: number[]): string {
    return bytes.map((b) => (b + 256).toString(2).slice(1)).join("");
  }

  /**
   * Parses the shared cubie state format used by V2/V3/V4 facelets responses
   * directly into KPatternData
   *
   * Layout (all versions share the same layout, but differ in start offset):
   *   corners: 7 x (3-bit piece ID + 2-bit orientation), 8th derived by checksum
   *   edges:   11 x (4-bit piece ID + 1-bit orientation), 12th derived by XOR checksum
   *
   */
  private parseStateToKPatternData(
    bits: string,
    cornerStart: number,
    edgeStart: number
  ): KPatternData | null {
    function pieceValuesToPieceData(
      ganPieceId: number,
      orientation: number,
      pieceNames: string[],
      pieceDataMapping: Map<string, PieceData>
    ): PieceData {
      const pieceName = pieceNames[ganPieceId];
      return pieceDataMapping.get(
        // diff orientations are just cyclic shifts of the piece name
        // e.g. URF with orientation 2 = FUR
        pieceName.slice(orientation) + pieceName.slice(0, orientation)
      )!;
    }

    const newState: KPatternData = {
      CORNERS: {
        pieces: [0, 0, 0, 0, 0, 0, 0, 0],
        orientation: [0, 0, 0, 0, 0, 0, 0, 0],
      },
      EDGES: {
        pieces: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        orientation: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      CENTERS: {
        pieces: [0, 1, 2, 3, 4, 5],
        orientation: [0, 0, 0, 0, 0, 0],
        orientationMod: [1, 1, 1, 1, 1, 1],
      },
    };

    let cornerChecksum = 0xf00;
    for (let i = 0; i < 7; i++) {
      const ganPieceId = parseInt(
        bits.slice(cornerStart + i * 3, cornerStart + i * 3 + 3),
        2
      );
      const orientation = parseInt(
        bits.slice(
          cornerStart + 7 * 3 + i * 2,
          cornerStart + 7 * 3 + i * 2 + 2
        ),
        2
      );
      cornerChecksum -= orientation << 3;
      cornerChecksum ^= ganPieceId;

      const pieceData = pieceValuesToPieceData(
        ganPieceId,
        (3 - orientation) % 3, //GAN goes CW, KPatternData goes CCW. (map 1 to 2, 2 to 1)
        GAN_CORNER_NAMES,
        CORNER_FACELET_PIECEDATA_MAPPING_333
      );

      newState.CORNERS.pieces[GAN_TO_BTIME_CORNER_ORDER[i]] = pieceData.id;
      newState.CORNERS.orientation[GAN_TO_BTIME_CORNER_ORDER[i]] =
        pieceData.orientation;
    }

    const lastCornerPieceData = pieceValuesToPieceData(
      cornerChecksum & 0x7,
      ((3 - ((cornerChecksum & 0xff8) % 24)) >> 3) % 3, //GAN goes CW, KPatternData goes CCW.
      GAN_CORNER_NAMES,
      CORNER_FACELET_PIECEDATA_MAPPING_333
    );
    newState.CORNERS.pieces[GAN_TO_BTIME_CORNER_ORDER[7]] =
      lastCornerPieceData.id;
    newState.CORNERS.orientation[GAN_TO_BTIME_CORNER_ORDER[7]] =
      lastCornerPieceData.orientation;

    // 11 transmitted edges; 12th derived via XOR checksum
    let edgeChecksum = 0;
    for (let i = 0; i < 11; i++) {
      const ganPieceId = parseInt(
        bits.slice(edgeStart + i * 4, edgeStart + i * 4 + 4),
        2
      );
      const orientation = parseInt(
        bits.slice(edgeStart + 11 * 4 + i, edgeStart + 11 * 4 + i + 1),
        2
      );
      edgeChecksum ^= (ganPieceId << 1) | orientation;
      const pieceData = pieceValuesToPieceData(
        ganPieceId,
        orientation,
        GAN_EDGE_NAMES,
        EDGE_FACELET_PIECEDATA_MAPPING_333
      );
      newState.EDGES.pieces[GAN_TO_BTIME_EDGE_ORDER[i]] = pieceData.id;
      newState.EDGES.orientation[GAN_TO_BTIME_EDGE_ORDER[i]] =
        pieceData.orientation;
    }
    const lastEdgePieceData = pieceValuesToPieceData(
      edgeChecksum >> 1,
      edgeChecksum & 1,
      GAN_EDGE_NAMES,
      EDGE_FACELET_PIECEDATA_MAPPING_333
    );
    newState.EDGES.pieces[GAN_TO_BTIME_EDGE_ORDER[11]] = lastEdgePieceData.id;
    newState.EDGES.orientation[GAN_TO_BTIME_EDGE_ORDER[11]] =
      lastEdgePieceData.orientation;

    return newState;
  }

  /**
   * V2 parsing
   */

  private parseV2Data(bytes: number[]): void {
    const locTime = performance.now();
    const bits = GanCube.toBitString(bytes);
    const mode = parseInt(bits.slice(0, 4), 2);

    if (mode === 1) {
      // Gyro — not yet handled; reserved for future use
    } else if (mode === 2) {
      // Move event
      const moveCnt = parseInt(bits.slice(4, 12), 2);
      if (
        moveCnt === this.prevMoveSequenceNumber ||
        this.prevMoveSequenceNumber === -1
      )
        return;

      const timeOffsets: number[] = [];
      const moves: string[] = [];
      let invalidMove = false;

      for (let i = 0; i < 7; i++) {
        const m = parseInt(bits.slice(12 + i * 5, 17 + i * 5), 2);
        timeOffsets[i] = parseInt(bits.slice(47 + i * 16, 63 + i * 16), 2);
        moves[i] = "URFDLB".charAt(m >> 1) + " '".charAt(m & 1);
        if (m >= 12) {
          moves[i] = "U ";
          invalidMove = true;
        }
      }

      if (invalidMove) {
        console.warn("[GanCube] V2: invalid move data — possible wrong key");
        return;
      }

      this.updateV2MoveTimes(moveCnt, moves, timeOffsets, locTime);
    } else if (mode === 4) {
      // Cube state (facelets)
      if (this.prevMoveSequenceNumber !== -1) return; // Only process on init

      const moveCnt = parseInt(bits.slice(4, 12), 2);
      // V2 corners start at bit 12 (7 corners x 3-bit permutation, then 7 x 2-bit orientation)
      // V2 edges start at bit 47 (11 edges x 4-bit perm, then 11 x 1-bit orientation)
      const state = this.parseStateToKPatternData(bits, 12, 47);
      if (!state) return;

      this.prevMoveSequenceNumber = moveCnt;
      this.processStateEvent({
        kpattern: new KPattern(this.kpuzzle, state),
        timestamp: locTime,
      });
    } else if (mode === 5) {
      // Hardware info
      const hw = `${parseInt(bits.slice(24, 32), 2)}.${parseInt(
        bits.slice(32, 40),
        2
      )}`;
      const sw = `${parseInt(bits.slice(8, 16), 2)}.${parseInt(
        bits.slice(16, 24),
        2
      )}`;
      console.log("[GanCube] V2 Hardware Version:", hw, "Software:", sw);
    } else if (mode === 9) {
      // Battery
      const level = parseInt(bits.slice(8, 16), 2);
      console.log("[GanCube] V2 Battery:", level + "%");
    } else {
      console.log("[GanCube] V2 unknown event mode:", mode);
    }
  }

  /**
   * V2 timing model: The cube sends time offsets (ms) between consecutive moves.
   * We maintain a `deviceTime` clock synced to local time, and emit move events
   * with reconstructed timestamps working backwards from the most recent move.
   */
  private updateV2MoveTimes(
    moveCnt: number,
    moves: string[],
    timeOffsets: number[],
    locTime: number
  ): void {
    const moveDiff = (moveCnt - this.prevMoveSequenceNumber) & 0xff;
    if (moveDiff > moves.length) {
      console.warn("[GanCube] V2: more moves lost than history can cover");
    }

    const actualDiff = Math.min(moveDiff, moves.length);

    // Sync device clock to wall clock
    let calcTs = this.deviceTime + this.deviceTimeOffset;
    for (let i = actualDiff - 1; i >= 0; i--) calcTs += timeOffsets[i];
    if (!this.deviceTime || Math.abs(locTime - calcTs) > 2000) {
      this.deviceTime += locTime - calcTs;
    }

    for (let i = actualDiff - 1; i >= 0; i--) {
      this.deviceTime += timeOffsets[i];
      this.processMoveEvent({
        move: new Move(moves[i].trim()),
        timestamp: this.deviceTime,
        duration: timeOffsets[i] < 200 ? timeOffsets[i] : undefined,
      });
    }

    this.deviceTimeOffset = locTime - this.deviceTime;
    this.prevMoveSequenceNumber = moveCnt;
  }

  /**
   * V3 parsing
   */

  private parseV3Data(bytes: number[]): void {
    const locTime = performance.now();
    const bits = GanCube.toBitString(bytes);

    const magic = parseInt(bits.slice(0, 8), 2);
    const mode = parseInt(bits.slice(8, 16), 2);
    const len = parseInt(bits.slice(16, 24), 2);

    if (magic !== 0x55 || len <= 0) {
      console.warn("[GanCube] V3: invalid magic or len", magic, len);
      return;
    }

    if (mode === 1) {
      // Move event
      const moveCnt = parseInt(bits.slice(64, 72) + bits.slice(56, 64), 2);
      if (
        moveCnt === this.prevMoveSequenceNumber ||
        this.prevMoveSequenceNumber === -1
      )
        return;

      const ts = parseInt(
        bits.slice(48, 56) +
          bits.slice(40, 48) +
          bits.slice(32, 40) +
          bits.slice(24, 32),
        2
      );
      const pow = parseInt(bits.slice(72, 74), 2);
      const axisCode = parseInt(bits.slice(74, 80), 2);
      const axis = [2, 32, 8, 1, 16, 4].indexOf(axisCode);

      if (axis === -1) {
        console.warn("[GanCube] V3: invalid axis code", axisCode);
        return;
      }

      const move = "URFDLB".charAt(axis) + " '".charAt(pow);
      this.moveBuffer.push({
        moveCnt,
        move,
        deviceTimestamp: ts,
        localTimestamp: locTime,
      });
      this.evictMoveBuffer(true);
    } else if (mode === 2) {
      // Cube state (facelets)
      const moveCnt = parseInt(bits.slice(32, 40) + bits.slice(24, 32), 2);
      if (this.prevMoveSequenceNumber !== -1) return;

      // V3 corners: bit 40, V3 edges: bit 77
      const state = this.parseStateToKPatternData(bits, 40, 77);
      if (!state) return;

      this.prevMoveSequenceNumber = moveCnt;
      this.processStateEvent({
        kpattern: new KPattern(this.kpuzzle, state),
        timestamp: locTime,
      });
    } else if (mode === 6) {
      // Move history response (for loss recovery)
      const startMoveCnt = parseInt(bits.slice(24, 32), 2);
      const numberOfMoves = (len - 1) * 2;

      for (let i = 0; i < numberOfMoves; i++) {
        const axis = parseInt(bits.slice(32 + 4 * i, 35 + 4 * i), 2);
        const pow = parseInt(bits.slice(35 + 4 * i, 36 + 4 * i), 2);
        if (axis < 6) {
          const move = "DUBFLR".charAt(axis) + " '".charAt(pow);
          this.injectLostMove({
            moveCnt: (startMoveCnt - i) & 0xff,
            move,
            deviceTimestamp: null,
            localTimestamp: null,
          });
        }
      }
      this.evictMoveBuffer(false);
    } else if (mode === 7) {
      // Hardware info
      const hw = `${parseInt(bits.slice(80, 84), 2)}.${parseInt(
        bits.slice(84, 88),
        2
      )}`;
      const sw = `${parseInt(bits.slice(72, 76), 2)}.${parseInt(
        bits.slice(76, 80),
        2
      )}`;
      console.log("[GanCube] V3 Hardware Version:", hw, "Software:", sw);
    } else if (mode === 16) {
      // Battery
      const level = parseInt(bits.slice(24, 32), 2);
      console.log("[GanCube] V3 Battery:", level + "%");
    } else {
      console.log("[GanCube] V3 unknown event mode:", mode);
    }
  }

  /**
   * V4 parsing
   */

  private parseV4Data(bytes: number[]): void {
    const locTime = performance.now();
    const bits = GanCube.toBitString(bytes);

    const mode = parseInt(bits.slice(0, 8), 2);
    const len = parseInt(bits.slice(8, 16), 2);

    if (mode === 0x01) {
      // Move event
      const moveCnt = parseInt(bits.slice(56, 64) + bits.slice(48, 56), 2);
      if (
        moveCnt === this.prevMoveSequenceNumber ||
        this.prevMoveSequenceNumber === -1
      )
        return;

      const ts = parseInt(
        bits.slice(40, 48) +
          bits.slice(32, 40) +
          bits.slice(24, 32) +
          bits.slice(16, 24),
        2
      );
      const pow = parseInt(bits.slice(64, 66), 2);
      const axisCode = parseInt(bits.slice(66, 72), 2);
      const axis = [2, 32, 8, 1, 16, 4].indexOf(axisCode);

      if (axis === -1) {
        console.warn("[GanCube] V4: invalid axis code", axisCode);
        return;
      }

      const move = "URFDLB".charAt(axis) + " '".charAt(pow);
      this.moveBuffer.push({
        moveCnt,
        move,
        deviceTimestamp: ts,
        localTimestamp: locTime,
      });
      this.evictMoveBuffer(true);
    } else if (mode === 0xed) {
      // Cube state (facelets)
      const moveCnt = parseInt(bits.slice(24, 32) + bits.slice(16, 24), 2);
      if (this.prevMoveSequenceNumber !== -1) return;

      // V4 corners: bit 32, V4 edges: bit 69
      const state = this.parseStateToKPatternData(bits, 32, 69);
      if (!state) return;

      this.prevMoveSequenceNumber = moveCnt;
      this.processStateEvent({
        kpattern: new KPattern(this.kpuzzle, state),
        timestamp: locTime,
      });
    } else if (mode === 0xd1) {
      // Move history response (for loss recovery)
      const startMoveCnt = parseInt(bits.slice(16, 24), 2);
      const numberOfMoves = (len - 1) * 2;

      for (let i = 0; i < numberOfMoves; i++) {
        const axis = parseInt(bits.slice(24 + 4 * i, 27 + 4 * i), 2);
        const pow = parseInt(bits.slice(27 + 4 * i, 28 + 4 * i), 2);
        if (axis < 6) {
          const move = "DUBFLR".charAt(axis) + " '".charAt(pow);
          this.injectLostMove({
            moveCnt: (startMoveCnt - i) & 0xff,
            move,
            deviceTimestamp: null,
            localTimestamp: null,
          });
        }
      }
      this.evictMoveBuffer(false);
    } else if (mode === 0xef) {
      // Battery
      const level = parseInt(bits.slice(8 + len * 8, 16 + len * 8), 2);
      console.log("[GanCube] V4 Battery:", level + "%");
    } else if (mode === 0xec) {
      // Gyro — reserved for future use
    } else if ([0xf5, 0xf6, 0xfa, 0xfc, 0xfd, 0xfe, 0xff].includes(mode)) {
      // Hardware info sub-types
      if (mode === 0xfd) {
        const sw = `${parseInt(bits.slice(24, 28), 2)}.${parseInt(
          bits.slice(28, 32),
          2
        )}`;
        console.log("[GanCube] V4 Software Version:", sw);
      } else if (mode === 0xfe) {
        const hw = `${parseInt(bits.slice(24, 28), 2)}.${parseInt(
          bits.slice(28, 32),
          2
        )}`;
        console.log("[GanCube] V4 Hardware Version:", hw);
      } else if (mode === 0xfc) {
        let hwName = "";
        for (let i = 0; i < len - 1; i++) {
          hwName += String.fromCharCode(
            parseInt(bits.slice(24 + i * 8, 32 + i * 8), 2)
          );
        }
        console.log("[GanCube] V4 Hardware Name:", hwName);
      }
    } else {
      console.log("[GanCube] V4 unknown event mode:", mode.toString(16));
    }
  }

  // ---------------------------------------------------------------------------
  // Move buffer + loss recovery (V3 / V4)
  //
  // Moves arrive with an 8-bit wrapping counter. We buffer them in arrival
  // order, then evict them sequentially. If a gap is detected we request
  // history from the cube to fill it.
  // ---------------------------------------------------------------------------

  /**
   * Returns true if `moveCnt` lies strictly inside the open circular range (start, end).
   */
  private isMoveNumberInRange(
    start: number,
    end: number,
    moveCnt: number,
    closedStart = false,
    closedEnd = false
  ): boolean {
    return (
      ((end - start) & 0xff) >= ((moveCnt - start) & 0xff) &&
      (closedStart || ((start - moveCnt) & 0xff) > 0) &&
      (closedEnd || ((end - moveCnt) & 0xff) > 0)
    );
  }

  /**
   * Attempts to insert a recovered (lost) move into the correct position in the buffer.
   */
  private injectLostMove(move: MoveBufferEntry): void {
    const { moveCnt } = move;

    if (this.moveBuffer.length > 0) {
      // Skip if already present
      if (this.moveBuffer.some((e) => e.moveCnt === moveCnt)) return;
      // Skip if not in the expected missing range
      if (
        !this.isMoveNumberInRange(
          this.prevMoveSequenceNumber,
          this.moveBuffer[0].moveCnt,
          moveCnt
        )
      )
        return;
      // Insert at head if it's exactly the missing predecessor
      if (moveCnt === ((this.moveBuffer[0].moveCnt - 1) & 0xff)) {
        this.moveBuffer.unshift(move);
        console.log("[GanCube] lost move recovered:", moveCnt, move.move);
      }
    } else {
      if (
        this.isMoveNumberInRange(
          this.prevMoveSequenceNumber,
          this.prevMoveSequenceNumber,
          moveCnt,
          false,
          true
        )
      ) {
        this.moveBuffer.unshift(move);
        console.log(
          "[GanCube] lost move recovered (empty buffer):",
          moveCnt,
          move.move
        );
      }
    }
  }

  /**
   * Drains the move buffer in sequence order, requesting history if there are gaps.
   */
  private evictMoveBuffer(reqLostMoves: boolean): void {
    while (this.moveBuffer.length > 0) {
      const diff =
        (this.moveBuffer[0].moveCnt - this.prevMoveSequenceNumber) & 0xff;

      if (diff > 1) {
        // Gap detected
        console.log("[GanCube] lost move detected; gap size:", diff - 1);
        if (reqLostMoves) {
          this.requestMoveHistory(this.moveBuffer[0].moveCnt, diff);
        }
        break;
      }

      const entry = this.moveBuffer.shift()!;
      const ts = entry.localTimestamp ?? performance.now();

      this.processMoveEvent({
        move: new Move(entry.move.trim()),
        timestamp: ts,
      });

      this.prevMoveSequenceNumber = entry.moveCnt;
    }

    // Safety valve: if the buffer grows unbounded something is very wrong
    if (this.moveBuffer.length > 16) {
      console.error("[GanCube] move buffer overflow — forcing disconnect");
      this.onDisconnect();
    }
  }

  protected processMoveEvent(event: MoveEvent): void {
    super.processMoveEvent(event);
    // Keep derived state in sync after each move
    const newState = this.state!.applyAlg(new Alg([event.move]));
    if (newState) {
      this.processStateEvent({
        kpattern: newState,
        timestamp: event.timestamp,
      });
    }
  }

  protected async onSync(): Promise<void> {
    this.prevMoveSequenceNumber = -1;
    this.moveBuffer = [];
    this.deviceTime = 0;
    this.deviceTimeOffset = 0;

    await this.refreshReadCharacteristic();
    await this.sendInitialRequests();
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
  namePrefixes: GAN_CUBE_NAME_PREFIXES,
  primaryServices: [SERVICE_UUID_V2, SERVICE_UUID_V3, SERVICE_UUID_V4],
  factory: (device: BluetoothDevice) => new GanCube(device),
});
