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
   * 创建注册实例
   * @param options 
   */
  constructor(options: ZookeeperRegistryOptions) {
    super();
    this.options = options;
    this.client = zookeeper.createClient(options.host, {});
  }

  /**
   * 连接注册中心
   */
  connect(): Promise<void> {
    log(`connecting zookeeper server: [${this.options.host}]`);
    return new Promise((resolve) => {
      this.client.once('connected', () => {
        log(`zookeeper server connected`);
        this.connected = true;
        resolve();
      });
      this.client.connect();
    });
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