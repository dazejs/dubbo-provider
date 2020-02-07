import * as zookeeper from 'node-zookeeper-client';
import { format as urlFormat, URL } from 'url';
import { IP } from '../common';
import { Registry } from '../registry/registry';
import { Channel } from './channel';


export interface ConsumerOptions {
  registry: Registry;
  application?: string;
  version?: string;
  root?: string;
  interfaceName: string;
  interfaceVersion?: string;
  interfaceGroup?: string;
}

export class Consumer {
  /**
   * 接口名称
   */
  interfaceName: string;

  /**
   * 接口版本
   */
  interfaceVersion: string;

  /**
   * 接口组别
   */
  interfaceGroup: string;

  /**
   * 注册中心根路径
   */
  registryRootPath: string;

  /**
   * 注册中心类别路径
   * providers/comsumers
   */
  registryCatePath: string;

  /**
   * 调用通道集合
   */
  channels: Map<string, Channel> = new Map();

  /**
   * 根路径
   */
  root: string;

  /**
   * 应用名
   */
  application: string;

  /**
   * 版本号
   */
  version: string;

  /**
   * 注册中心实例
   */
  registry: Registry;

  /**
   * 创建实例
   * @param consumer 
   * @param interfaceName 
   * @param interfaceVersion 
   * @param interfaceGroup 
   */
  constructor(options: ConsumerOptions) {
    this.registry = options.registry;
    this.interfaceName = options.interfaceName;
    this.interfaceVersion = options.interfaceVersion ?? '0.0.0';
    this.interfaceGroup = options.interfaceGroup ?? '-';
    this.root = options.root ?? 'dubbo';
    this.application = options.application ?? 'dazejs';
    this.version = options.version ?? '0.0.0';
    this.registryRootPath = `/${options.root ?? 'dubbo'}/${options.interfaceName}`;
    this.registryCatePath = `${this.registryRootPath}/consumers`;
  }

  /**
   * 获取注册中心消费者路径
   * @param consumerUrl 
   */
  getRegistryConsumerPath(consumerUrl: string) {
    return `${this.registryCatePath}/${encodeURIComponent(consumerUrl)}`;
  }

  /**
   * 获取注册中心根路径
   */
  getRegistryRootPath() {
    return this.registryRootPath;
  }

  /**
   * 获取注册中心类别路径
   */
  getRegistryCatePath() {
    return this.registryCatePath;
  }

  /**
   * 获取注册中心提供者根路径
   */
  getRegistryProviderRootPath() {
    return `${this.registryRootPath}/providers`;
  }

  /**
   * 注册调用者
   * 将当前消费者注册到注册中心
   */
  async register() {
    const url = new URL('consumer://');

    const ipAddress = IP.address() || '';
    url.host = `${ipAddress}/${this.interfaceName}`;
    url.searchParams.append('application', this.application);
    url.searchParams.append('category', 'consumers');
    url.searchParams.append('dubbo', this.version);
    url.searchParams.append('interface', this.interfaceName);
    url.searchParams.append('pid', `${process.pid}`);
    url.searchParams.append('revision', this.interfaceVersion);
    url.searchParams.append('side', 'consumer');
    url.searchParams.append('timestamp', `${Date.now()}`);
    url.searchParams.append('version', this.interfaceVersion);
    if (this.interfaceGroup !== '-') url.searchParams.append('group', this.interfaceGroup);

    const consumerUrl = urlFormat(url);
    await this.registry.create(`/${this.root}`, '', 0);
    await this.registry.create(this.registryRootPath, '', 0);
    await this.registry.create(this.registryCatePath, '', 0);
    await this.registry.create(this.getRegistryConsumerPath(consumerUrl), ipAddress, 0);
    return this;
  }

  /**
   * 订阅服务
   * @param id 
   */
  async subscribe(id: string) {
    return this.setupChannels(await this.getChildren(id));
  }

  /**
   * 监听提供者节点列表
   * @param id 
   * @param event 
   */
 async notify(id: string, event: zookeeper.Event) {
    switch (event.getName()) {
      case 'NODE_CREATED':
      case 'NODE_DELETED':
      case 'NODE_DATA_CHANGED': return;
      case 'NODE_CHILDREN_CHANGED': return this.setupChannels(await this.getChildren(id));
    }
    return;
  }

  /**
   * 关闭调用者
   * 关闭所有通道的连接
   */
  async close() {
    for (const [, channel] of this.channels) {
      channel.close();
    }
  }

  /**
   * 调用一个接口方法
   * @param method 
   * @param args 
   */
  async invoke<T = any>(method: string, args: any[] = []): Promise<T> {
    let channels: Channel[] = Array.from(this.channels.values());
    if (channels.length === 0) {
      channels = await new Promise(resolve => {
        const time = Date.now();
        const timer = setInterval(() => {
          if (Date.now() - time >= 3000) {
            clearInterval(timer);
            return resolve([]);
          }
          const _channels = Array.from(this.channels.values());
          if (_channels.length) {
            clearInterval(timer);
            return resolve(_channels);
          }
        }, 30);
      });
    }

    if (channels.length === 0) throw new Error('no providers');
    // 找到负载最低的通道进行调用
    let _picedkChannel: Channel = channels[0];
    for (let i = 1; i < channels.length; i++) {
      const channel = channels[i];
      if (_picedkChannel.getWorkload() > channel.getWorkload()) {
        _picedkChannel = channel;
      }
    }
    return _picedkChannel.invoke(method, args) as Promise<T>;
  }

  /**
   * 配置通道
   * @param list 
   */
  async setupChannels(list: Map<string, URL>) {
    const promises: Promise<void>[] = [];
    for (const [host, _url] of list) {
      if (!this.channels.has(host)) { // add
        const channel = new Channel(this, _url);
        promises.push(
          channel.connect().then(() => {
            this.channels.set(host, channel);
          })
        );
      } else { // modify
        const channel = this.channels.get(host);
        channel?.setService(_url);
      }
    }
    for (const [host, channel] of this.channels) {
      if (!list.has(host)) {
        this.channels.delete(host);
        channel.close();
      }
    }
    await Promise.all(promises);
    return list.size;
  }

  /**
   * 获取对应类别所有提供者
   * @param id 
   */
  async getChildren(id: string) {
    const result: Map<string, URL> = new Map();
    const hasProvider = await this.registry.exists(this.getRegistryProviderRootPath());
    if (!hasProvider) throw new Error(`no providers on ${this.interfaceName}`);
    const children = await this.registry.children(this.getRegistryProviderRootPath(), e => this.notify(id, e));

    if (!children) return result;
    for (const child of children) {
      const url = new URL(decodeURIComponent(child));
      const interfaceName = url.searchParams.get('interface');
      const interfaceVersion = url.searchParams.get('version');
      const interfaceGroup = url.searchParams.get('default.grouop') || '-';
      if (interfaceName === this.interfaceName && interfaceVersion === this.interfaceVersion && interfaceGroup === this.interfaceGroup) {
        result.set(url.host, url);
      }
    }

    return result;
  }
}