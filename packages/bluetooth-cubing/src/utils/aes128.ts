export class AES128Cipher {
  private static sbox = [
    99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118,
    202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114,
    192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49,
    21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9,
    131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209,
    0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170,
    251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143,
    146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236,
    95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34,
    42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6,
    36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213,
    78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166,
    180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3,
    246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217,
    142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230,
    66, 104, 65, 153, 45, 15, 176, 84, 187, 22,
  ];

  private static sboxInv = (() => {
    const inv = new Array<number>(256);
    for (let i = 0; i < 256; i++) inv[AES128Cipher.sbox[i]] = i;
    return inv;
  })();

  private static xtime = (() => {
    const t = new Array<number>(256);
    for (let i = 0; i < 128; i++) {
      t[i] = i << 1;
      t[i + 128] = (i << 1) ^ 0x1b;
    }
    return t;
  })();

  private static shiftTabI = [
    0, 13, 10, 7, 4, 1, 14, 11, 8, 5, 2, 15, 12, 9, 6, 3,
  ];

  private key: number[];
  public iv: number[] = [];

  constructor(key: number[]) {
    const ex = key.slice();
    let rcon = 1;

    for (let i = 16; i < 176; i += 4) {
      let t = ex.slice(i - 4, i);
      if (i % 16 === 0) {
        t = [
          AES128Cipher.sbox[t[1]] ^ rcon,
          AES128Cipher.sbox[t[2]],
          AES128Cipher.sbox[t[3]],
          AES128Cipher.sbox[t[0]],
        ];
        rcon = AES128Cipher.xtime[rcon];
      }
      for (let j = 0; j < 4; j++) {
        ex[i + j] = ex[i + j - 16] ^ t[j];
      }
    }

    this.key = ex;
  }

  private addRoundKey(s: number[], rkey: number[]) {
    for (let i = 0; i < 16; i++) {
      s[i] ^= rkey[i];
    }
  }

  private shiftSubAdd(s: number[], rkey: number[]) {
    const t = s.slice();
    for (let i = 0; i < 16; i++) {
      s[i] = AES128Cipher.sboxInv[t[AES128Cipher.shiftTabI[i]]] ^ rkey[i];
    }
  }

  private invShiftSubAdd(s: number[], rkey: number[]) {
    const t = s.slice();
    for (let i = 0; i < 16; i++) {
      s[AES128Cipher.shiftTabI[i]] = AES128Cipher.sbox[t[i] ^ rkey[i]];
    }
  }

  private mixColumns(s: number[]) {
    for (let i = 12; i >= 0; i -= 4) {
      const s0 = s[i + 0];
      const s1 = s[i + 1];
      const s2 = s[i + 2];
      const s3 = s[i + 3];
      const h = s0 ^ s1 ^ s2 ^ s3;
      s[i] ^= h ^ AES128Cipher.xtime[s0 ^ s1];
      s[i + 1] ^= h ^ AES128Cipher.xtime[s1 ^ s2];
      s[i + 2] ^= h ^ AES128Cipher.xtime[s2 ^ s3];
      s[i + 3] ^= h ^ AES128Cipher.xtime[s3 ^ s0];
    }
  }

  private invMixColumns(s: number[]) {
    for (let i = 0; i < 16; i += 4) {
      const s0 = s[i];
      const s1 = s[i + 1];
      const s2 = s[i + 2];
      const s3 = s[i + 3];
      const h = s0 ^ s1 ^ s2 ^ s3;
      const xh = AES128Cipher.xtime[h];
      const h1 = AES128Cipher.xtime[AES128Cipher.xtime[xh ^ s0 ^ s2]] ^ h;
      const h2 = AES128Cipher.xtime[AES128Cipher.xtime[xh ^ s1 ^ s3]] ^ h;
      s[i] ^= h1 ^ AES128Cipher.xtime[s0 ^ s1];
      s[i + 1] ^= h2 ^ AES128Cipher.xtime[s1 ^ s2];
      s[i + 2] ^= h1 ^ AES128Cipher.xtime[s2 ^ s3];
      s[i + 3] ^= h2 ^ AES128Cipher.xtime[s3 ^ s0];
    }
  }

  decrypt(buf: number[]): number[] {
    this.addRoundKey(buf, this.key.slice(160, 176));

    for (let i = 144; i >= 16; i -= 16) {
      this.shiftSubAdd(buf, this.key.slice(i, i + 16));
      this.invMixColumns(buf);
    }

    this.shiftSubAdd(buf, this.key.slice(0, 16));
    return buf;
  }

  encrypt(buf: number[]): number[] {
    this.invShiftSubAdd(buf, this.key.slice(0, 16));

    for (let i = 16; i < 160; i += 16) {
      this.mixColumns(buf);
      this.invShiftSubAdd(buf, this.key.slice(i, i + 16));
    }

    this.addRoundKey(buf, this.key.slice(160, 176));
    return buf;
  }
}
