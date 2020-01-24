import { Invoker } from '../consumer/invoker';

const PRIMITIVE_TYPE_REF = {
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

export class Invocation {
  private methodName: string;
  
  private args: any[];

  private attachments: Record<string, any>;

  private attributes: Record<string, any> = {};

  private parameterTypesDesc: string;

  private invoker?: Invoker

  constructor(
    methodName: string,
    args: any[],
    attachments?: Record<string, any>,
    invoker?: Invoker,
  ) {
    this.methodName = methodName;
    this.args = args;
    this.invoker = invoker;
    this.attachments = attachments ?? {};
    this.initParameterDesc();
  }

  public getMethodName() {
    return this.methodName;
  }

  public getInvoker() {
    return this.invoker;
  }

  public get(key: string) {
    return this.attributes[key];
  }

  public put(key: string, value: string) {
    this.attributes[key] = value;
  }

  private initParameterDesc() {
    if (!(this.args && this.args.length)) {
      this.parameterTypesDesc = '';
      return;
    };
    const desc: string[] = [];
    for (const parameter of this.args) {
      let type = parameter['$class'];
      if (type[0] === '[') {
        desc.push('[');
        type = type.slice(1);
      }
      if (PRIMITIVE_TYPE_REF[type]) {
        desc.push(PRIMITIVE_TYPE_REF[type]);
      }
      else {
        desc.push('L');
        desc.push(type.replace(/\./gi, '/'));
        desc.push(';');
      }
    }
    console.log(desc.join(''));
    this.parameterTypesDesc = desc.join('');
    return;
  }

  public getParameterTypesDesc() {
    return this.parameterTypesDesc;
  }

  public setParameterTypesDesc(parameterTypesDesc: string) {
    this.parameterTypesDesc = parameterTypesDesc;
  }

  public getArgs() {
    return this.args;
  }

  public setArgs(args: any[]) {
    this.args = args ?? [];
  }

  public getAttachments() {
    return this.attachments;
  }

  public setAttachments(attachments: Record<string, any>) {
    this.attachments = attachments ?? {};
  }

  public getAttachment(key: string, defaultValue?: string) {
    return this.attachments[key] ?? defaultValue;
  }

  public setAttachment(key: string, value: string) {
    this.attachments[key] = value;
  }
}