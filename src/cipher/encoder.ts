
import Hessian from 'hessian.js';
import { Bytes } from '../common';

//header length
const DUBBO_HEADER_LENGTH = 16;
// magic header.
const DUBBO_MAGIC_HEADER = 0xdabb;
// message flag.
const FLAG_REQEUST = 0x80;
const FLAG_TWOWAY = 0x40;

//com.alibaba.dubbo.common.serialize.support.hessian.Hessian2Serialization中定义
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;

//dubbo最大的body序列化数据的大小
//com.alibaba.dubbo.common.Constants.DEAULT_PAY_LOAD
const DUBBO_DEFAULT_PAY_LOAD = 8 * 1024 * 1024; // 8M

const PrimitiveTypeRef: any = {
  void: 'V',
  boolean: 'Z',
  byte: 'B',
  char: 'C',
  double: 'D',
  float: 'F',
  int: 'I',
  long: 'J',
  short: 'S',
};


export interface Payload {
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

export class Encoder {

  payload: Payload;

  constructor(payload: Payload) {
    this.payload = payload;
  }

  encode() {
    const body = this.encodeBody();
    const head = this.encodeHead(body.length);
    return Buffer.concat([head, body]);
  }

  encodeBody() {
    const encoder = new Hessian.EncoderV2();

    const {
      dubboVersion,
      dubboInterface,
      version,
      methodName,
      methodArgs,
    } = this.payload;

    //dubbo version
    encoder.write(dubboVersion);
    //path interface
    encoder.write(dubboInterface);
    //interface version
    encoder.write(version);
    //method name
    encoder.write(methodName);

    //parameter types
    encoder.write(this.getParameterTypes(methodArgs));

    //arguments
    if (methodArgs && methodArgs.length) {
      for (const arg of methodArgs) {
        encoder.write(arg);
      }
    }
    //attachments
    encoder.write(this.getAttachments());

    return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
  }

  encodeHead(length: number) {
    const header = Buffer.alloc(DUBBO_HEADER_LENGTH);
    //set magic number
    //magic high
    header[0] = DUBBO_MAGIC_HEADER >>> 8;
    //magic low
    header[1] = DUBBO_MAGIC_HEADER & 0xff;

    // set request and serialization flag.
    header[2] = FLAG_REQEUST | HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_TWOWAY;

    this.setRequestId(header);

    //check body length
    if (length > 0 && length > DUBBO_DEFAULT_PAY_LOAD) {
      throw new Error(
        `Data length too large: ${length}, max length: ${DUBBO_DEFAULT_PAY_LOAD}`,
      );
    }

    //body长度int-> 4个byte

    header.writeUInt32BE(length, 12);
    return header;
  }

  setRequestId(header: Buffer) {
    const { requestId } = this.payload;
    const buffer = Bytes.toBytes8(requestId);
    header[4] = buffer[0];
    header[5] = buffer[1];
    header[6] = buffer[2];
    header[7] = buffer[3];
    header[8] = buffer[4];
    header[9] = buffer[5];
    header[10] = buffer[6];
    header[11] = buffer[7];
  }

  getAttachments() {
    const {
      path,
      dubboInterface,
      group,
      timeout,
      version,
      application,
      attachments,
    } = this.payload;

    //merge dubbo attachments and customize attachments
    const map: Record<string, any> = {
      path: path || dubboInterface,
      interface: dubboInterface,
      version: version || '0.0.0',
      ...attachments,
    };

    group && (map['group'] = group);
    timeout && (map['timeout'] = timeout);
    application && (map['application'] = application);

    const attachmentsHashMap = {
      $class: 'java.util.HashMap',
      $: map,
    };

    return attachmentsHashMap;
  }

  getParameterTypes(args?: any[]) {
    if (!(args && args.length)) return '';
    const desc: string[] = [];
    for (const arg of args) {
      let type = arg['$class'];
      if (type[0] === '[') {
        desc.push('[');
        type = type.slice(1);
      }
      if (PrimitiveTypeRef[type]) {
        desc.push(PrimitiveTypeRef[type]);
      }
      else {
        desc.push('L');
        desc.push(type.replace(/\./gi, '/'));
        desc.push(';');
      }
    }
    return desc.join('');
  }
}