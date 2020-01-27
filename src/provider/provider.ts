import * as net from 'net';
import { Registry } from '../registry/registry';
import { Service, ProviderServiceOption } from './service';
// import { Decoder } from '../consumer/DEPRECATED_cipher';
import { DubboProvider as DubboProviderBase } from '../base';
import { Codec } from '../codec';
// import { getServiceChunkId } from '../utils';
// import { Request } from '../request';
import { Response, Result} from '../response';
import { Request, Invocation } from '../request';
// import java from 'js-to-java';


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

  // decoder = new Decoder()
  
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


  onMessage(buffer: Buffer, socket: net.Socket) {
    console.warn('监听到提供者接收数据');
    this.setLastReadTimestamp();
    const req = new Codec().decode(buffer);
    console.log(req, 'req');
    if (req) {
      if (req instanceof Request) {
        const inv = req.getData() as Invocation;
        // const serviceId = getServiceChunkId(inv.getAttachment('path'), inv.getAttachment('group') ?? '-', inv.getAttachment('version'));
        // const service = this.cache.get(serviceId);
        const res = new Response(req.getId());
        res.setStatus(Response.OK);
        res.setVersion(req.getVersion() as string);
        const result = new Result('xxx123');
        console.log(inv.getAttachment('interface'), 'interface');
        result.setAttachment('path', inv.getAttachment('path'));
        // result.setAttachment('interface', inv.getAttachment('interface'));
        result.setAttachment('version', inv.getAttachment('version'));
        
        res.setResult(result);
        console.log(res, 'response');
        const data = new Codec().encode(res) as Buffer;
        console.log(data);
        this.send(data, socket);
        // console.log(serviceId, this.cache);
      }
    }
    // const receive = this.decoder.receive(buffer);
    // console.log(receive);
  }

  send(data: Buffer, socket: net.Socket) {
    console.warn('提供者发送');
    socket.write(data);
  }

  async listen() {
    if (!this.registry.connected) await this.registry.connect();
    this.server = net.createServer((socket) => {
      socket.on('data', (data) => {
        this.onMessage(data, socket);
        socket.end();
      });
    });
    // this.server.on('data', this.onMessage);
    await new Promise((resolve, reject) => {
      this.server.listen(this.port, (err?: Error) => {
        console.log(this.port, 'port');
        if (err) return reject(err);
        return resolve();
      });
    });
    await this.publish();
  }
}