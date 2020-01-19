import { Registry } from '../registry/registry';
import { getServiceChunkId } from '../utils';
import { Invoker } from './invoker';

export interface ConsumerOptions {
  application?: string;
  version?: string;
  root?: string;
  registry: Registry;
}

export class Consumer {
  /**
   * 注册中心注册的应用名
   */
  application: string;

  /**
   * 注册版本
   */
  version: string;

  /**
   * 根节点
   */
  root: string;

  /**
   * 注册中心实例
   */
  registry: Registry;

  /**
   * 调用者缓存
   */
  cache: Map<string, Invoker> = new Map();

  /**
   * 创建消费者实例
   * @param options 
   */
  constructor(options: ConsumerOptions) {
    this.application = options.application || 'dazejs';
    this.version = options.version || '0.0.0';
    this.root = options.root || 'dubbo';
    this.registry = options.registry;
  }

  /**
   * 根据接口获取调用者
   * @param interfaceName 
   * @param interfaceVersion 
   * @param interfaceGroup 
   */
  async get(interfaceName: string, interfaceVersion = '0.0.0', interfaceGroup = '-') {
    const id = getServiceChunkId(interfaceName, interfaceGroup, interfaceVersion);
    if (this.cache.has(id)) return this.cache.get(id);
    const invoker = new Invoker(this, interfaceName, interfaceVersion, interfaceGroup);
    await invoker.register();
    const count = await invoker.subscribe(id);
    if (count === 0) {
      this.cache.delete(id);
      await invoker.close();
      throw new Error(`Cannot find the interface [${interfaceName}]`);
    }
    return invoker;
  }
}