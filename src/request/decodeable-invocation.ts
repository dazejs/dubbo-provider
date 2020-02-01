import { Invocation } from './invocation';
import { Request } from './request';

export class DecodeableInvocation extends Invocation {

  inputStream: any;

  request: Request;

  constructor(request: Request, inputStream: any) {
    super();
    this.request = request;
    this.inputStream = inputStream;
  }

  decode() {
    const dubboVersion = this.inputStream.read();
    this.request.setVersion(dubboVersion);
    this.setAttachment('dubbo', dubboVersion);

    const path = this.inputStream.read();
    this.setAttachment('path', path);
    this.setAttachment('version', this.inputStream.read());

    const metthodName = this.inputStream.read();
    this.setMethodName(metthodName);

    const desc = this.inputStream.read();
    this.setParameterTypesDesc(desc);

    const len = this.getDubboArgsLength(desc);
    const args: any[] = [];
    for (let i = 0; i < len; i++) {
      args.push(this.inputStream.read());
    }
    this.setArgs(args);

    const attachments = this.inputStream.read();
    this.setAttachments(attachments);
    return this;
  }

  getDubboArgsLength(desc: string) {
    return this.getDubboArrayArgsLength(desc, 0);
  }

  getDubboArrayArgsLength(desc: string, i: number) {
    const dot = desc.charAt(0);
    switch (dot) {
      case '[': return this.getDubboNormalizeArgsLength(desc.substring(1), i);
      default: return this.getDubboNormalizeArgsLength(desc, i);
    }
  }

  getDubboNormalizeArgsLength(desc: string, i: number) {
    if (!desc) return i;
    const dot = desc.charAt(0);
    switch (dot) {
      case 'L':
        const j = desc.indexOf(';');
        if (j > -1) return this.getDubboArrayArgsLength(desc.substring(j + 1), i + 1);
        return i;
      default: return this.getDubboArrayArgsLength(desc.substring(1), i + 1);
    }
  }
}