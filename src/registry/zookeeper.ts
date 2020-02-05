import * as zookeeper from 'node-zookeeper-client';
import { Registry } from './registry';
import debug from 'debug';

const log = debug('dubbo-provider:zookeeper');

export interface ZookeeperRegistryOptions {
  host: string;
  sessionTimeout?: number;
  spinDelay?: number;
  retries?: number;
}

export class ZookeeperRegistry extends Registry {
  /**
   * 是否已连接
   */
  connected = false;

  /**
   * 客户端实例
   */
  client: zookeeper.Client;

  /**
   * options
   */
  options: ZookeeperRegistryOptions;

  /**
     * 健康检查定时器
     */
  private heartbeatCheckTimer: NodeJS.Timer;


  private heartbeatFailCount = 0;

  /**
   * 创建注册实例
   * @param options 
   */
  constructor(options: ZookeeperRegistryOptions) {
    super();
    this.options = options;
  }

  /**
   * 连接注册中心
   */
  connect(): Promise<void> {
    log(`connecting zookeeper server: [${this.options.host}]`);
    return new Promise((resolve) => {
      // node-zookeeper-client 当连不上zk时会无限重连
      // 所以这里需要做手动超时检测
      const timeId = setTimeout(() => {
        log('Connection timeout, unable to establish connection with server');
        this.reconnect();
      }, 30000);

      if (this.client) {
        this.client.removeAllListeners();
      }
      this.client = zookeeper.createClient(this.options.host, {});

      this.client.once('connected', () => {
        clearTimeout(timeId);
        log(`zookeeper server connected`);
        this.connected = true;
        this.setupHeartbeat();
        resolve();
      });

      this.client.on('disconnected', () => {
        clearTimeout(timeId);
        log('Disconnected from server');
        this.reconnect();
      });

      this.client.once('expired', () => {
        clearTimeout(timeId);
        log('Session expired, closing the connection');
        // 检测到 session 过期后，主动断开连接
        // 触发 disconnected 事件，进行重连
        this.connected = false;
        this.client.close();
      });
      log('Connecting to server');
      this.client.connect();
    });
  }

  /**
   * 开启心跳检测
   */
  private setupHeartbeat() {
    if (this.heartbeatCheckTimer) {
      clearInterval(this.heartbeatCheckTimer);
    }
    log('Start the heartbeat detection function');
    this.heartbeatCheckTimer = setInterval(() => {
      const state = this.client.getState();
      switch (state) {
        case zookeeper.State.EXPIRED:
        case zookeeper.State.DISCONNECTED:
          this.heartbeatFailCount++;
          log(`heartbeat: The automatic heartbeat check failed, failures count: ${this.heartbeatFailCount}`);
          break;
        default:
          this.heartbeatFailCount = 0;
          log('heartbeat: The automatic heartbeat check success');
          break;
      }
      if (this.heartbeatFailCount >= 3) {
        log('heartbeat: Automatic heartbeat check mechanism detects abnormal connection, ready to reconnect');
        this.reconnect();
      }
    }, 20000);
  }

  reconnect() {
    if (this.heartbeatCheckTimer) {
      clearInterval(this.heartbeatCheckTimer);
    }
    log('reconnect: Trying to reconnect with the server...');
    if (this.client && this.connected) {
      this.connected = false;
      this.client.close();
    }
    return this.connect();
  }

  /**
   * 关闭连接
   */
  close() {
    this.client.close();
    this.connected = false;
  }

  /**
   * 创建节点
   * 当节点已存在的时候，不做处理
   * @param nodePath 
   * @param value 
   * @param mode 
   */
  async create(nodePath: string, value: string, mode: number): Promise<string | void> {
    const isExists = await this.exists(nodePath);
    if (isExists) return;
    const node: string = await new Promise((resolve, reject) => {
      this.client.create(nodePath, Buffer.from(value), mode, (err, node) => {
        if (err) return reject(err);
        log(`zookeeper node created: [${nodePath}]`);
        resolve(node);
      });
    });
    return node;
  }

  /**
   * 判断节点是否已存在
   * @param nodePath 
   */
  async exists(nodePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.exists(nodePath, (err, stat) => {
        if (err) return reject(err);
        return resolve(!!stat);
      });
    });
  }

  /**
   * 获取子节点列表
   * @param path 
   * @param watcher 
   */
  children(path: string, watcher?: (event: zookeeper.Event) => void): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const callback = (err: Error | zookeeper.Exception, children: string[]) => {
        if (err) return reject(err);
        return resolve(children);
      };
      if (watcher) {
        this.client.getChildren(path, watcher, callback);
      } else {
        this.client.getChildren(path, callback);
      }
    });
  }
}