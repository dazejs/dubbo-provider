

import { Result } from './result';
import { Codec } from '../codec';

export class DecodeableResult extends Result {

  inputStream: any;

  constructor(inputStream: any) {
    super();
    this.inputStream = inputStream;
  }

  decode() {
    const flag = this.inputStream.readInt();
    switch(flag) {
      case Codec.RESPONSE_NULL_VALUE:
        break;
      case Codec.RESPONSE_VALUE:
        this.handleValue(this.inputStream);
        break;
      case Codec.RESPONSE_WITH_EXCEPTION:
        this.handleException(this.inputStream);
        break;
      case Codec.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS:
        this.handleAttachments(this.inputStream);
        break;
      case Codec.RESPONSE_VALUE_WITH_ATTACHMENTS:
        this.handleValue(this.inputStream);
        this.handleAttachments(this.inputStream);
        break;
      case Codec.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS:
        this.handleException(this.inputStream);
        this.handleAttachments(this.inputStream);
        break;
      default:
        throw new Error(`Unknown result flag, expect '0' '1' '2' '3' '4' '5', but received: ${flag}`);
    }
    return this;
  }


  handleValue(inputStream: any) {
    const value = inputStream.read();
    console.log(value, 'value');
    this.setValue(value);
  }

  handleAttachments(inputStream: any) {
    const attachments = inputStream.read();
    this.setAttachments(attachments);
  }

  handleException(inputStream: any) {
    const exception = inputStream.read();
    const err = exception instanceof Error
      ? exception
      : new Error(exception);
    this.setException(err);
  }
}