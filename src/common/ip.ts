import * as os from 'os';

export class IP {
  /**
   * 获取本机 IP 地址
   */
  static address() {
    const interfaces = os.networkInterfaces();
    const all = Object.keys(interfaces).map(key => {
      const addresses = interfaces?.[key]?.filter(details => details.family.toLowerCase() === 'ipv4' && !this.isLoopback(details.address));
      return addresses?.[0]?.address;
    }).filter(Boolean);
    return all[0];
  }

   /**
    * 判断是否本地 ip
    * @param addr 
    */
  static isLoopback(addr: string) {
    return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/
      .test(addr) ||
      /^fe80::1$/.test(addr) ||
      /^::1$/.test(addr) ||
      /^::$/.test(addr);
  }
}