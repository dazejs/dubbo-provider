import * as net from 'net';
import { Registry } from '../registry/registry';
import { Service, ProviderServiceOption } from './service';
import { Decoder } from '../cipher';
import { DubboProvider as DubboProviderBase } from '../base';


export interface ProviderOptions {
  application?: string;
  version?: string;
  root?: string;
  port: number;
  pid: number;
  registry: Registry;
}


export class Provider {
  server: net.Server;
  application: string;
  root: string;
  version: string;
  port: number;
  pid: number;
  registry: Registry;
  cache: Map<string, Service> = new Map();

  lastReadTimestamp = Date.now();
  lastWriteTimestamp = Date.now();

  decoder = new Decoder()
  
  constructor(options: ProviderOptions) {
    this.application = options.application ?? 'dazejs';
    this.root = options.root ?? 'dubbo';
    this.version = options.version ?? '0.0.0';
    this.port = options.port;
    this.pid = options.pid;
    this.registry = options.registry;
  }

  getLastReadTimestamp() {
    return this.lastReadTimestamp;
  }

  setLastReadTimestamp() {
    this.lastReadTimestamp = Date.now();
  }

  getLastWriteTimestamp() {
    return this.lastWriteTimestamp;
  }

  setLastWriteTimestamp() {
    this.lastWriteTimestamp = Date.now();
  }

  registerService(handler: DubboProviderBase, options: ProviderServiceOption) {
    const service = new Service(this, options);
    service.setHandler(handler);
    this.cache.set(service.getServiceId(), service);
    return this;
  }

  publish() {
    const services = this.cache.values();
    const promises: Promise<Service>[] = [];
    for (const service of services) {
      promises.push(
        service.register()
      );
    }
    return Promise.all(promises);
  }


  onMessage(buffer: Buffer) {
    this.setLastReadTimestamp();
    const receive = this.decoder.receive(buffer);
    console.log(receive);
  }

  async listen() {
    if (!this.registry.connected) await this.registry.connect();
    this.server = net.createServer();
    this.server.on('data', this.onMessage);
    await new Promise((resolve, reject) => {
      this.server.listen(this.port, (err?: Error) => {
        if (err) return reject(err);
        return resolve();
      });
    });
    await this.publish();
  }
}