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
