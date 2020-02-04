import java from 'js-to-java';
import * as net from 'net';
import * as url from 'url';
import { Codec } from '../codec';
import { Invocation, Request } from '../request';
import { Response, Result } from '../response';
import { Consumer } from './consumer';
import { Constants } from '../common/constants';

export class Channel {
  /**
   * 依赖的调用者
   */
  consumer: Consumer;

  /**
   * 服务 URL
   */
  service: url.URL;

  /**
   * socket 客户端实例
   */
  client: net.Socket;

  /**
   * 是否已连接
   */
  connected = false;

  /**
   * 解码器
   */
  // decoder = new Decoder();

  /**
   * 数据响应回调集合
   */
  callbacks = new Map();

  /**
   * 健康检查定时器
   */
  heartbeatTimer: NodeJS.Timer;

  /**
   * 最后读时间
   */
  lastReadTimestamp = Date.now();

  /**
   * 最后写时间
   */
  lastWriteTimestamp = Date.now();

  /**
   * 负载大小
   */
  workload = 0;

  /**
   * 健康检查失败次数
   */
  heartbeatFails = 0

  /**
   * codec instance
   */
  codec = new Codec();

  constructor(consumer: Consumer, service: url.URL) {
    this.consumer = consumer;
    this.service = service;
  }

  /**
   * 获取连接状态
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 获取负载大小
   */
  getWorkload() {
    return this.workload;
  }

  /**
   * 重新设置服务 URL
   * @param service 
   */
  setService(service: url.URL) {
    this.service = service;
  }

  /**
   * 获取最后读时间
   */
  getLastReadTimestamp() {
    return this.lastReadTimestamp;
  }

  /**
   * 设置最后读时间为当前时间
   */
  setLastReadTimestamp() {
    this.lastReadTimestamp = Date.now();
  }

  /**
   * 获取最后写时间
   */
  getLastWriteTimestamp() {
    return this.lastWriteTimestamp;
  }

  /**
   * 设置最后写时间为当前时间
   */
  setLastWriteTimestamp() {
    this.lastWriteTimestamp = Date.now();
  }
  
  /**
   * 获取服务超时时间
   */
  getServiceTimeout() {
    return Number(this.service.searchParams.get('default.timeout'));
  }

  /**
   * 获取服务重试次数
   */
  getServiceRetries() {
    return Number(this.service.searchParams.get('default.retries'));
  }

  /**
   * 获取健康检查间隔时间
   */
  getServiceHeartbeat() {
    return Number(this.service.searchParams.get('heartbeat') ?? 60 * 1000);
  }

  /**
   * 获取健康检查超时时间
   */
  getServiceHeartTimeout() {
    return Number(this.service.searchParams.get('heartbeat.timeout') ?? this.getServiceHeartbeat() * 3);
  }

  /**
   * 连接服务
   */
  async connect() {
    this.client = net.createConnection({
      host: this.service.hostname,
      port: Number(this.service.port)
    });

    await new Promise((resolve, reject) => {
      this.client.on('error', (err: Error) => {
        reject(err);
      });
      this.client.once('ready', () => {
        this.connected = true;
        resolve();
        this.startHeartbeatTimer();
      });
      this.client.on('data', (buffer: Buffer) => this.onMessage(buffer));
      this.client.on('close', () => {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
        }
      });
    });
  }

  /**
   * 重新连接服务
   */
  async reconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.connected) {
      this.close();
    }
    await this.connect();
  }

  close() {
    if (!this.connected) return;
    this.client.destroy();
    this.connected = false;
  }

  /**
   * 开启健康检查
   */
  startHeartbeatTimer() {
    const heartbeat = this.getServiceHeartbeat();
    const heartbeatTimeout = this.getServiceHeartTimeout();

    // new ReconnectTimerTask(this, heartbeat, heartbeatTimeout).run();
    if (heartbeat > 0) {
      this.heartbeatTimer = setInterval(() => {
        const time = Date.now();
        const readTime = time - this.lastReadTimestamp;
        const writeTime = time - this.lastWriteTimestamp;
        if (readTime > heartbeat || writeTime > heartbeat) {
          this.setLastWriteTimestamp();
          const req = new Request();
          req.setEvent(Constants.HEARTBEAT_EVENT);
          const payload = this.codec.encode(req);
          payload && this.send(payload);
        }
        if (readTime > heartbeatTimeout) {
          this.heartbeatFails++;
          if (this.heartbeatFails >= 3) {
            this.reconnect();
          }
        }
      }, heartbeat);
    }
  }

  autoArgs(args: any[]) {
    const res: object[] = [];
    for (const arg of args) {
      if (typeof arg === 'string') {
        res.push(java.String(arg));
      } else if (typeof arg === 'number') {
        if (~String(arg).indexOf('.')) {
          res.push(java.Float(arg));
        } else {
          res.push(java.Long(arg));
        }
      } else {
        res.push(arg);
      }
    }
    return res;
  }

  /**
   * 调用方法
   * @param method 
   * @param args 
   */
  invoke(method: string, args: any[] = []) {
    // 未注册 methgod 时
    const methods = this.service.searchParams.get('methods') || '';
    if (!methods.split(',').includes(method)) {
      return;
    }

    const req = new Request();
    const inv = new Invocation(
      method,
      this.autoArgs(args),
    );
    inv.setAttachment('path', this.service.searchParams.get('interface') as string);
    inv.setAttachment('interface', this.service.searchParams.get('interface') as string);
    inv.setAttachment('version', this.service.searchParams.get('version') as string ?? '0.0.0');
    req.setData(inv);

    this.workload++;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.workload--;
        this.callbacks.delete(req.getId());
        return reject(new Error('rpc invoke timeout:' + this.getServiceTimeout()));
      }, this.getServiceTimeout());
      this.callbacks.set(req.getId(), (data: any) => {
        clearTimeout(timer);
        this.callbacks.delete(req.getId());
        this.workload--;
        this.heartbeatFails = 0;
        return resolve(data);
      });
      const payload = this.codec.encode(req);
      payload && this.send(payload);
    });
  }

  /**
   * 发送数据
   * @param buf 
   */
  send(buf: Buffer) {
    if (!this.connected) return;
    this.client.write(buf);
  }

  /**
   * 监听响应
   * @param buffer 
   */
  onMessage(buffer: Buffer) {
    this.setLastReadTimestamp();
    // const receive = this.decoder.receive(buffer);
    const reses = this.codec.decode(buffer) ?? [];
    for (const res of reses) {
      if (res instanceof Response) {
        if (!res.isHeartbeat()) {
          const requestId = res.getId();
          if (this.callbacks.has(requestId)) {
            const fn = this.callbacks.get(requestId);
            const result = res.getResult();
            if (result instanceof Result) {
              fn(result.getValue());
            } else {
              fn(result);
            }
          }
        }
      }
    }
  }
}