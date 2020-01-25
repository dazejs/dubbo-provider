
let id = 0;

export class Request {

  private id: number;

  private event = false;

  private data?: any;

  private twoWay = true;

  private version?: string;

  constructor(id?: number) {
    if (id) this.id = id;
    else this.id = this.newId();
  }

  private newId() {
    id = id + 1;
    if (id === Number.MAX_SAFE_INTEGER) id = 1;
    return id;
  }

  public getId() {
    return this.id;
  }

  public getVersion() {
    return this.version;
  }
  public setVersion(version: string) {
    this.version = version;
  }

  public isEvent() {
    return this.event;
  }

  public setEvent(event: string | boolean) {
    if (typeof event === 'boolean') {
      this.event = event;
    } else {
      this.event = true;
      this.data = event;
    }
  }

  public setData(data: any) {
    this.data = data;
  }

  public isHeartbeat() {
    return this.event && !this.data;
  }

  public getData() {
    return this.data;
  }

  public isTwoWay() {
    return this.twoWay;
  }

  public setTwoWay(twoWay: boolean) {
    this.twoWay = twoWay;
  }
}