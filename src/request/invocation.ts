const PRIMITIVE_TYPE_REF: Record<string, string> = {
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
  private methodName?: string;
  
  private args?: any[];

  private attachments?: Record<string, any> = {};

  private attributes: Record<string, any> = {};

  private parameterTypesDesc: string;

  constructor(
    methodName?: string,
    args?: any[],
    attachments?: Record<string, any>,
  ) {
    this.methodName = methodName;
    this.args = args;
    this.attachments = attachments ?? {};
    this.initParameterDesc();
  }

  public getMethodName() {
    return this.methodName;
  }

  public setMethodName(methodName: string) {
    this.methodName = methodName;
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
    if (!this.attachments) return defaultValue;
    return this.attachments[key] ?? defaultValue;
  }

  public setAttachment(key: string, value: string) {
    if (!this.attachments) this.attachments = {};
    this.attachments[key] = value;
  }
}