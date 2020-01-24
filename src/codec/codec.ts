
// import { Channel } from '../consumer/channel';
import Hessian from 'hessian.js';
import { Request, Invocation } from '../request';
import { Response, DecodeableResult } from '../response';
import { Bytes, Constants, Version } from '../common';
import compareVersions from 'compare-versions';


export interface ResponseResult {
  path?: string;
  requestId: number;
  dubboVersion: string;
  dubboInterface: string;
  version: string;
  methodName: string;
  methodArgs?: any[];
  group?: string;
  timeout?: number;
  application: string;
  attachments?: {
    [name: string]: any;
  };
}

export class Codec {
  // header length.
  private HEADER_LENGTH = 16;
  // magic header.
  private MAGIC = 0xdabb;
  // message flag.
  private FLAG_REQUEST = 0x80;
  private FLAG_TWOWAY = 0x40;
  private FLAG_EVENT = 0x20;
  
  // 由于目前只支持 Hessian2
  // 这边先写死 Hessian2Serialization
  // com.alibaba.dubbo.common.serialize.support.hessian.Hessian2Serialization 中定义
  private HESSIAN2_SERIALIZATION_CONTENT_ID = 2;

  // Response
  public static RESPONSE_WITH_EXCEPTION = 0;
  public static RESPONSE_VALUE = 1;
  public static RESPONSE_NULL_VALUE = 2;
  public static RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS = 3;
  public static RESPONSE_VALUE_WITH_ATTACHMENTS = 4;
  public static RESPONSE_NULL_VALUE_WITH_ATTACHMENTS = 5;

  private DUBBO_VERSION = Version.getProtocolVersion();

  // ignore ATTACH
  private DUBBO_INVOCATION_PREFIX = '_DUBBO_IGNORE_ATTACH_';

  private MAGIC_HIGH = 0xda;
  private MAGIC_LOW = 0xbb;

  /**
   * 
   * @param data 
   */
  decode(buffer: Buffer) {
    let packet = Buffer.concat([Buffer.alloc(0), buffer]);
    let length = packet.length;
    while (packet.length >= this.HEADER_LENGTH) {
      // check magic number.
      if (packet[0] !== this.MAGIC_HIGH || packet[1] !== this.MAGIC_LOW) {
        const magicHighIndex = packet.indexOf(packet[0]);
        const magicLowIndex = packet.indexOf(packet[1]);
        if (magicHighIndex === -1 || magicLowIndex === -1) return;
        if (magicHighIndex !== -1 && magicLowIndex !== -1 && magicLowIndex - magicHighIndex === 1) {
          packet = packet.slice(magicHighIndex);
          length = packet.length;
        }
        return;
      }
      if (packet[0] === this.MAGIC_HIGH && packet[1] === this.MAGIC_LOW) {
        if (length < this.HEADER_LENGTH) return;
        const header = packet.slice(0, this.HEADER_LENGTH);
        const bodyLengthBuffer = Buffer.from([
          header[12],
          header[13],
          header[14],
          header[15],
        ]);
        const bodyLength = Bytes.fromBytes4(bodyLengthBuffer);
        if (this.HEADER_LENGTH + bodyLength > length) return;
        const dataBuffer = packet.slice(0, this.HEADER_LENGTH + bodyLength);
        packet = packet.slice(this.HEADER_LENGTH + bodyLength);
        length = packet.length;
        return this.decodeBody(dataBuffer);
      }
    }
    return;
  }

  decodeBody(dataBuffer: Buffer) {
    const flag = dataBuffer[2];
    const idBuffer = dataBuffer.slice(4, 12);
    const id = Bytes.fromBytes8(idBuffer);
    if ((flag & this.FLAG_REQUEST) === 0) {
      const res = new Response(id);
      if ((flag & this.FLAG_EVENT) !== 0) {
        res.setEvent(true);
      }
      const status = dataBuffer[3];
      res.setStatus(status);
      if (status === Response.OK) {
        const input = new Hessian.DecoderV2(dataBuffer.slice(this.HEADER_LENGTH));
        const result = new DecodeableResult(input);
        result.decode();
        res.setResult(result);
      }
      return res;
    } else {
      // TODO
      console.log('decode request');
    }
    return;
  }

  /**
   * encode
   * @param data 
   */
  encode(data: any) {
    if (data instanceof Request) {
     return this.encodeRequest(data);
    }
    if (data instanceof Response) {
      return this.encodeResponse(data);
    }
    return;
  }

  /**
   * encode request
   * @param req 
   */
  encodeRequest(req: Request) {
    // header
    const header = Buffer.alloc(this.HEADER_LENGTH);
    // set magic number.
    header[1] = this.MAGIC;
    header[0] = this.MAGIC >>> 8;
    // set request and serialization flag.
    header[2] = this.FLAG_REQUEST | this.HESSIAN2_SERIALIZATION_CONTENT_ID | 64;
    if (req.isTwoWay()) {
      header[2] |= this.FLAG_TWOWAY;
    }
    if (req.isEvent()) {
      header[2] |= this.FLAG_EVENT;
    }
    // set request id.
    Bytes.long2bytes(req.getId(), header, 4);

    const out = new Hessian.EncoderV2();
    if (req.isEvent()) {
      this.encodeEventData(out, req.getData());
    } else {
      this.encodeRequestData(out, req.getData(), this.DUBBO_VERSION);
    }

    const body = out.byteBuffer._bytes.slice(0, out.byteBuffer._offset);
    this.checkPayload(body.length);
    Bytes.int2bytes(body.length, header, 12);
    return Buffer.concat([header, body]);
  }

  /**
   * encode event data
   * @param encoder 
   * @param data 
   */
  encodeEventData(encoder: any, data: any) {
    encoder.write(data);
  }

  /**
   * encode request data
   * @param out 
   * @param inv 
   * @param version 
   */
  encodeRequestData(out: any, inv: Invocation, version: string) {

    out.write(version);
    out.write(String(inv.getAttachment('path')));
    out.write(String(inv.getAttachment('version')));

    out.write(inv.getMethodName());
    out.write(inv.getParameterTypesDesc());

    const args = inv.getArgs();

    for (const arg of args) {
      out.write(arg);
    }
    // console.log(this.sieveUnnecessaryAttachments(inv));
    out.write(
      this.sieveUnnecessaryAttachments(inv)
    );
  }

  encodeResponse(res: Response) {
    // header
    const header = Buffer.alloc(this.HEADER_LENGTH);
    // set magic number.
    header[1] = this.MAGIC;
    header[0] = this.MAGIC >>> 8;
    // set request and serialization flag.
    header[2] = this.FLAG_REQUEST | this.HESSIAN2_SERIALIZATION_CONTENT_ID;
    if (res.isHeartbeat()) {
      header[2] |= this.FLAG_EVENT;
    }
    const status = res.getStatus();
    header[3] = status;
    // set request id.

    // this.setRequestId(res.getId(), header);
    Bytes.long2bytes(res.getId(), header, 4);

    const out = new Hessian.EncoderV2();

    if (status === Response.OK) {
      if (res.isHeartbeat()) {
        this.encodeEventData(out, res.getResult());
      } else {
        this.encodeResponseData(out, res.getResult(), this.DUBBO_VERSION);
      }
    } else {
      out.write(res.getErrorMessage());
    }

    const body = out.byteBuffer._bytes.slice(0, out.byteBuffer._offset);

    this.checkPayload(body.length);

    Bytes.int2bytes(body.length, header, 12);

    // header.writeUInt32BE(body.length, 12);

    return Buffer.concat([header, body]);
  }

  isSupportResponseAttachment(version?: string) {
    if (!version) return false;
    // for previous dubbo version(2.0.10/020010~2.6.2/020602), this version is the jar's version, so they need to
    // be ignore
    if (compareVersions(version, '2.0.10') >= 0 && compareVersions(version, '2.6.2') <= 0) return false;
    // 2.8.x is reserved for dubbox
    if (compareVersions(version, '2.8.0') >= 0 && compareVersions(version, '2.9.0') < 0) return false;
    // // 2.0.2
    return compareVersions(version, '2.0.2') >= 0;
  }

  encodeResponseData(out: any, result?: ResponseResult, version?: string) {
    const attach = this.isSupportResponseAttachment(version);

    if (result === null || result === undefined) {
      out.write(
        attach ? Codec.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS : Codec.RESPONSE_NULL_VALUE
      );
    } else {
      out.write(
        attach ? Codec.RESPONSE_VALUE_WITH_ATTACHMENTS : Codec.RESPONSE_VALUE
      );
    }

    if (attach) {
      out.write({
        ...(result?.attachments ?? {}),
        dubbo: this.DUBBO_VERSION
      });
    }
  }

  checkPayload(size: number) {
    const payload = Constants.DEFAULT_PAYLOAD;
    if (payload > 0 && size > payload) {
      const e = new Error(`Data length too large: ${size}, max payload: ${payload}`);
      throw e;
    }
  }

  sieveUnnecessaryAttachments(inv: Invocation) {
    const attachments = inv.getAttachments();
    const attachmentsToPass = {};

    for (const key of Object.keys(attachments)) {
      if (!key.startsWith(this.DUBBO_INVOCATION_PREFIX)) {
        attachmentsToPass[key] = attachments[key];
      }
    }

    return {
      $class: 'java.util.HashMap',
      $: attachmentsToPass,
    };
  }

  // getAttachments(data: any) {
  //   const {
  //     path,
  //     dubboInterface,
  //     group,
  //     timeout,
  //     version,
  //     application,
  //     attachments,
  //   } = data;

  //   //merge dubbo attachments and customize attachments
  //   const map: Record<string, any> = {
  //     path: path || dubboInterface,
  //     interface: dubboInterface,
  //     version: version || '0.0.0',
  //     ...attachments,
  //   };

  //   group && (map['group'] = group);
  //   timeout && (map['timeout'] = timeout);
  //   application && (map['application'] = application);

  //   const attachmentsHashMap = {
  //     $class: 'java.util.HashMap',
  //     $: map,
  //   };

  //   return attachmentsHashMap;
  // }
}