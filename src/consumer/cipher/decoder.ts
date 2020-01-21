
import Hessian from 'hessian.js';
import { Heartbeat } from '../../heartbeat';
import { Bytes } from '../../common';

const DUBBO_HEADER_LENGTH = 16;
const DUBBO_MAGIC_HIGH = 0xda;
const DUBBO_MAGIC_LOW = 0xbb;

//com.alibaba.dubbo.remoting.exchange.Response
enum DUBBO_RESPONSE_STATUS {
  OK = 20,
  CLIENT_TIMEOUT = 30,
  SERVER_TIMEOUT = 31,
  BAD_REQUEST = 40,
  BAD_RESPONSE = 50,
  SERVICE_NOT_FOUND = 60,
  SERVICE_ERROR = 70,
  SERVER_ERROR = 80,
  CLIENT_ERROR = 90,
}

//body response status
enum DUBBO_RESPONSE_BODY_FLAG {
  RESPONSE_WITH_EXCEPTION = 0,
  RESPONSE_VALUE = 1,
  RESPONSE_NULL_VALUE = 2,
  //@since dubbo2.6.3
  RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS = 3,
  RESPONSE_VALUE_WITH_ATTACHMENTS = 4,
  RESPONSE_NULL_VALUE_WITH_ATTACHMENTS = 5,
}

export class Decoder {

  _buffer = Buffer.alloc(0);

  receive(data: Buffer): any {
    this._buffer = Buffer.concat([this._buffer, data]);
    let length = this._buffer.length;
    while (length >= DUBBO_HEADER_LENGTH) {
      //判断buffer 0, 1 是不是dubbo的magic high , magic low
      const magicHigh = this._buffer[0];
      const magicLow = this._buffer[1];
      if (magicHigh != DUBBO_MAGIC_HIGH || magicLow != DUBBO_MAGIC_LOW) {
        const magicHighIndex = this._buffer.indexOf(magicHigh);
        const magicLowIndex = this._buffer.indexOf(magicLow);
        if (magicHighIndex === -1 || magicLowIndex === -1) return;
        if (magicHighIndex !== -1 && magicLowIndex !== -1 && magicLowIndex - magicHighIndex === 1) {
          this._buffer = this._buffer.slice(magicHighIndex);
          length = this._buffer.length;
        }
        return;
      }
      if (magicHigh === DUBBO_MAGIC_HIGH && magicLow === DUBBO_MAGIC_LOW) {
        if (length < DUBBO_HEADER_LENGTH) return;
        const header = this._buffer.slice(0, DUBBO_HEADER_LENGTH);
        const bodyLengthBuff = Buffer.from([
          header[12],
          header[13],
          header[14],
          header[15],
        ]);
        const bodyLength = Bytes.fromBytes4(bodyLengthBuff);
        //判断是不是心跳
        if (Heartbeat.isHeartBeat(header)) {
          this._buffer = this._buffer.slice(DUBBO_HEADER_LENGTH + bodyLength);
          length = this._buffer.length;
          return;
        }

        if (DUBBO_HEADER_LENGTH + bodyLength > length) return;

        const dataBuffer = this._buffer.slice(0, DUBBO_HEADER_LENGTH + bodyLength);
        this._buffer = this._buffer.slice(DUBBO_HEADER_LENGTH + bodyLength);
        length = this._buffer.length;
        return this.decode(dataBuffer);
      }
    }
  }

  decode(dataBuffer: Buffer) {
    let res = null;
    let err: null | Error = null;
    let attachments = {};
    const requestIdBuff = dataBuffer.slice(4, 12);
    const requestId = Bytes.fromBytes8(requestIdBuff);
    const status = dataBuffer[3];
    if (status != DUBBO_RESPONSE_STATUS.OK) {
      return {
        err: new Error(dataBuffer.slice(DUBBO_HEADER_LENGTH + 2).toString('utf8')),
        res: null,
        attachments,
        requestId,
      };
    }

    const body = new Hessian.DecoderV2(dataBuffer.slice(DUBBO_HEADER_LENGTH));
    const flag = body.readInt();

    switch (flag) {
      case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE:
        err = null;
        res = body.read();
        attachments = {};
        break;
      case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE:
        err = null;
        res = null;
        attachments = {};
        break;
      case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION:
        const exception = body.read();
        err =
          exception instanceof Error
            ? exception
            : new Error(exception);
        res = null;
        attachments = {};
        break;
      case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS:
        err = null;
        res = null;
        attachments = body.read();
        break;
      case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS:
        err = null;
        res = body.read();
        attachments = body.read();
        break;
      case DUBBO_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS:
        const exp = body.read();
        err = exp instanceof Error ? exp : new Error(exp);
        res = null;
        attachments = body.read();
        break;
      default:
        err = new Error(
          `Unknown result flag, expect '0/1/2/3/4/5', get  ${flag})`,
        );
        res = null;
    }
    return {
      requestId,
      err,
      res,
      attachments,
    };
  }
}