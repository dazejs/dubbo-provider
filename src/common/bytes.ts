
export class Bytes {
  /**
   * number to bytes8
   * @param num 
   */
  static toBytes8(num: number) {
    const buf = Buffer.allocUnsafe(8);
    const high = Math.floor(num / 4294967296);
    const low = (num & 0xffffffff) >>> 0;
    buf.writeUInt32BE(high, 0);
    buf.writeUInt32BE(low, 4);
    return buf;
  }

  /**
   * buffer to number
   * @param buf 
   */
  static fromBytes8(buf: Buffer) {
    const high = buf.readUInt32BE(0);
    const low = buf.readUInt32BE(4);
    return high * 4294967296 + low;
  }

  /**
   * number to bytes4
   * @param num 
   */
  static toBytes4(num: number) {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(num, 0);
    return buf;
  }

  /**
   * buffer to number
   * @param buf 
   */
  static fromBytes4(buf: Buffer) {
    return buf.readUInt32BE(0);
  }
}