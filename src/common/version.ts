

export class Version {

  // Dubbo RPC protocol version, for compatibility, it must not be between 2.0.10 ~ 2.6.2
  private static DEFAULT_DUBBO_PROTOCOL_VERSION = '2.0.2';

  // version 1.0.0 represents Dubbo rpc protocol before v2.6.2
  // private static LEGACY_DUBBO_PROTOCOL_VERSION = '1.0.0'

  public static getProtocolVersion() {
    return this.DEFAULT_DUBBO_PROTOCOL_VERSION;
  }
}