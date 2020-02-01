import * as net from 'net';
import { Registry } from '../registry/registry';
import { Service, ProviderServiceOption } from './service';
// import { Decoder } from '../consumer/DEPRECATED_cipher';
import { DubboProvider as DubboProviderBase } from '../base';
import { Codec } from '../codec';
import { getServiceId } from '../utils';
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
  /**
   * TCP Server
   */
  server: net.Server;

  /**
   * dubbo application
   */
  application: string;

  /**
   * dubbo root path
   */
  root: string;

  /**
   * dubbo version
   */
  version: string;

  /**
   * dubbo provider port
   */
  port: number;

  /**
   * dubbo provider pid
   */
  pid: number;

  /**
   * dubbo provider registry instance
   */
  registry: Registry;

  /**
   * dubbo services cache
   */
  services: Map<string, Service> = new Map();

  /**
   * last read timestamp
   */
  lastReadTimestamp = Date.now();

  /**
   * last write timestamp
   */
  lastWriteTimestamp = Date.now();

  /**
   * Create provider instance
   * @param options 
   */
  constructor(options: ProviderOptions) {
    this.application = options.application ?? 'dazejs';
    this.root = options.root ?? 'dubbo';
    this.version = options.version ?? '0.0.0';
    this.port = options.port;
    this.pid = options.pid;
    this.registry = options.registry;
  }

  /**
   * get last read timestamp
   */
  getLastReadTimestamp() {
    return this.lastReadTimestamp;
  }

  /**
   * set last read timestamp to now
   */
  setLastReadTimestamp() {
    this.lastReadTimestamp = Date.now();
  }

  /**
   * get last write timestamp
   */
  getLastWriteTimestamp() {
    return this.lastWriteTimestamp;
  }

  /**
   * set last write timestamp to now
   */
  setLastWriteTimestamp() {
    this.lastWriteTimestamp = Date.now();
  }

  /**
   * register service
   * @param handler 
   * @param options 
   */
  registerService(handler: DubboProviderBase, options: ProviderServiceOption) {
    const service = new Service(this, options);
    service.setHandler(handler);
    this.services.set(service.getId(), service);
    return this;
  }

  /**
   * publish all services
   */
  publish() {
    const services = this.services.values();
    const promises: Promise<Service>[] = [];
    for (const service of services) {
      promises.push(
        service.register()
      );
    }
    return Promise.all(promises);
  }

  /**
   * handle message
   * @param buffer 
   * @param socket 
   */
  async onMessage(buffer: Buffer, socket: net.Socket) {
    this.setLastReadTimestamp();
    const req = new Codec().decode(buffer);
    if (req instanceof Request) {
      const inv = req.getData();
      if (!(inv instanceof Invocation)) return;
      
      // const serviceId = getServiceChunkId(inv.getAttachment('path'), inv.getAttachment('group') ?? '-', inv.getAttachment('version'));
      // const service = this.cache.get(serviceId);
      const methodName = inv.getMethodName();
      console.log(methodName, 'sadasd');
      if (!methodName) return;
      const serviceId = getServiceId(inv.getAttachment('path'), inv.getAttachment('group') ?? '-', inv.getAttachment('version') ?? '0.0.0');
      const service = this.services.get(serviceId);
      if (!service) return;

      const res = new Response(req.getId());
      res.setStatus(Response.OK);
      res.setVersion(req.getVersion() as string);
      const result = new Result(
        await service.performHandler(methodName, [
          ...(inv.getArgs() ?? [])
        ])
      );
      // console.log(inv.getAttachment('interface'), 'interface');
      result.setAttachment('path', inv.getAttachment('path'));
      // result.setAttachment('interface', inv.getAttachment('interface'));
      result.setAttachment('version', inv.getAttachment('version'));
      
      res.setResult(result);
      // console.log(res, 'response');
      const data = new Codec().encode(res) as Buffer;
      // console.log(data);
      this.send(data, socket);
        // console.log(serviceId, this.cache);
    }
    // const receive = this.decoder.receive(buffer);
    // console.log(receive);
  }

  /**
   * send message
   * @param data 
   * @param socket 
   */
  send(data: Buffer, socket: net.Socket) {
    // console.warn('提供者发送');
    socket.write(data);
  }

  /**
   * listen tcp server
   */
  async listen() {
    if (!this.registry.connected) await this.registry.connect();
    this.server = net.createServer((socket) => {
      socket.on('data', async (data) => {
        await this.onMessage(data, socket);
        socket.end();
      });
    });
    
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