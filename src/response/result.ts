

export class Result {
  private value: any;

  private attachments: Record<string, any> = {};

  private exception?: Error;

  constructor(value?: any) {
    this.value = value;
  }

  public setValue(value?: any) {
    this.value = value;
  }

  public getValue() {
    return this.value;
  }

  public getAttachments() {
    return this.attachments;
  }

  public setAttachments(attachments: Record<string, any>) {
    this.attachments = attachments ?? {};
  }

  public addAttachments(attachments: Record<string, any>) {
    if (!attachments) return;
    if (!this.attachments) this.attachments = {};
    this.attachments = {
      ...this.attachments,
      ...attachments
    };
  }

  public getAttachment(key: string, defaultValue?: any) {
    if (!this.attachments) return defaultValue;
    return this.attachments[key] ?? defaultValue;
  }

  public setAttachment(key: string, value: any) {
    if (!this.attachments) this.attachments = {};
    this.attachments[key] = value;
  }

  public getException() {
    return this.exception;
  }

  public setException(err: Error) {
    this.exception = err;
  }
}