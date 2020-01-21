// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { Application } from '@dazejs/framework';
import { DubboProvider as DubboProviderBase, DubboConsumer as DubboConsumerBase } from './base';
import { ZookeeperRegistry } from './registry';
import { Registry } from './registry/registry';
// import * as assert from 'assert';
import { Provider } from './provider';
import { Consumer } from './consumer';

export type RegistryType = 'zookeeper'

export interface DubboMetadataStruct {
  interfaceName?: string;
  registry?: string;
}

export interface DubboMethodMetadataStruct {
  method?: string;
}

export class Dubbo {
  app: Application;

  providers: Map<string, Provider> = new Map();

  consumers: Map<RegistryType, Consumer> = new Map();

  registries: Map<string, Registry> = new Map();

  constructor(app: Application) {
    this.app = app;
  }

  async registerProvider(DubboProvider: typeof DubboProviderBase) {
    const dubboMetadata: DubboMetadataStruct = Reflect.getMetadata('dubbo', DubboProvider) ?? {};
    // const methodMetadata: Map<string, DubboMethodMetadataStruct> = Reflect.getMetadata('dubbo.method', DubboProvider) ?? new Map();

    const registryName = dubboMetadata.registry ?? 'default';

    const { type = 'zookeeper', port = 20880, ...options } = this.app.get('config').get(`dubbo.${dubboMetadata.registry}`, {});

    if (!this.registries.has(registryName)) {
      const registry = this.getRegistry(type, options);
      if (registry) {
        await registry.connect();
        this.registries.set(registryName, registry);
      }
    }

    if (!this.providers.has(registryName)) {
      const registry = this.registries.get(registryName);
      if (registry) {
        const provider = new Provider({
          registry,
          port,
          pid: process.pid
        });
        this.providers.set(registryName, provider);

        const _provider = this.providers.get(registryName) as Provider;
        const dubboProvider = this.app.get<DubboProviderBase>(DubboProvider);
        _provider.registerService(
          dubboProvider,
          {
            interface: dubboMetadata.interfaceName as string,
            methods: Reflect.ownKeys(DubboProvider.prototype).filter(item => item !== 'constructor' && typeof DubboProvider.prototype[item] === 'function') as string[],
          }
        );
      }
    }
  }

  async registerConsumer(DubboConsomer: typeof DubboConsumerBase) {
    console.log(DubboConsomer);
    // const dubboMetadata: DubboMetadataStruct = Reflect.getMetadata('dubbo', DubboConsomer) ?? {};
    // const methodMetadata: Map<string, DubboMethodMetadataStruct> = Reflect.getMetadata('dubbo.method', DubboConsomer) ?? new Map();
  }

  getRegistry(type: RegistryType, options: any): Registry | undefined {
    switch(type) {
      case 'zookeeper':
        return new ZookeeperRegistry(options);
      default:
        return;
    }
  }

  async run() {
    const promises: Promise<void>[] = [];
    for (const [, provider] of this.providers) {
      promises.push(
        provider.listen()
      );
    }
    await Promise.all(promises);
  }
}