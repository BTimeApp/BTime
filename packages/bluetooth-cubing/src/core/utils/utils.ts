/**
 * From gan-web-bluetooth
 * Calculate ArrayBuffer checksum using CRC-16/CCIT-FALSE algorithm variation
 */
export function crc16ccit(buff: ArrayBuffer): number {
    var dataView = new DataView(buff);
    var crc: number = 0xFFFF;
    for (let i = 0; i < dataView.byteLength; ++i) {
        crc ^= dataView.getUint8(i) << 8;
        for (let j = 0; j < 8; ++j) {
            crc = (crc & 0x8000) > 0 ? (crc << 1) ^ 0x1021 : crc << 1;
        }
    }
    return crc & 0xFFFF;
}