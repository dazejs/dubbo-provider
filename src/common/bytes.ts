
export class Bytes {

  /**
   * to byte array.
   * @param v 
   * @param b 
   * @param off 
   */
  public static long2bytes(v: number, b: Buffer, off: number) {
    const _buf = this.toBytes8(v);
    b[off + 7] = _buf[7];
    b[off + 6] = _buf[6];
    b[off + 5] = _buf[5];
    b[off + 4] = _buf[4];
    b[off + 3] = _buf[3];
    b[off + 2] = _buf[2];
    b[off + 1] = _buf[1];
    b[off + 0] = _buf[0];
  }

  public static int2bytes(v: number, b: Buffer, off: number) {
    b.writeUInt32BE(v, off);
  }

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