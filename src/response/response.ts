
import { Constants } from '../common/constants';

export class Response {

  public static OK = 20;

  private id = 0;

  private version: string;

  private status = Response.OK;

  private event = false;

  private result?: any;

  private errorMessage?: string;

  constructor(id?: number, version?: string) {
    if (id) this.id = id;
    if (version) this.version = version;
  }

  public getId() {
    return this.id;
  }

  public setId(id: number) {
    this.id = id;
  }

  public getVersion() {
    return this.version;
  }

  public setVersion(version: string) {
    this.version = version;
  }

  public getStatus() {
    return this.status;
  }

  public setStatus(status: number) {
    this.status = status;
  }

  public isEvent() {
    return this.event;
  }

  public setEvent(event: string | boolean | null) {
    if (typeof event === 'boolean') {
      this.event = event;
    } else {
      this.event = true;
      this.result = event;
    }
  }

  public isHeartbeat() {
    return this.event && this.result === Constants.HEARTBEAT_EVENT;
  }

  public getResult() {
    return this.result;
  }

  public setResult(result: any) {
    this.result = result;
  }

  public getErrorMessage() {
    return this.errorMessage;
  }

  public setErrorMessage(msg: string) {
    this.errorMessage = msg;
  }
}