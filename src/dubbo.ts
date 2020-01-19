import { Application } from '@dazejs/framework';
import { DubboProvider as DubboProviderBase} from './base';
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

  providers: Map<RegistryType, Provider> = new Map();

  consumers: Map<RegistryType, Consumer> = new Map();

  registries: Map<string, Registry> = new Map();

  constructor(app: Application) {
    this.app = app;
  }

  async registerProvider(DubboProvider: DubboProviderBase) {
    const dubboMetadata: DubboMetadataStruct = Reflect.getMetadata('dubbo', DubboProvider) ?? {};
    const methodMetadata: Map<string, DubboMethodMetadataStruct> = Reflect.getMetadata('dubbo.method', DubboProvider) ?? new Map();

    const registryName = dubboMetadata.registry ?? 'default';

    const { type = 'zookeeper', port = 20880, ...options } = this.app.get('config').get(`dubbo.${dubboMetadata.registry}`, {});

    if (!this.registries.has(registryName)) {
      const registry = this.getRegistry(type, options);
      if (registry) {
        await registry.connect();
        this.registries.set(registryName, registry);
      }
    }

    if (!this.providers.has(type)) {
      const registry = this.registries.get(type);
      if (registry) {
        const provider = new Provider({
          registry,
          port,
          pid: process.pid
        });
        this.providers.set(type, provider);
      }
    }
    const methodsArr: string[] = [];

    for (const [, metadata] of methodMetadata) {
      methodsArr.push(metadata.method as string);
    }

    const provider = this.providers.get(type) as Provider;

    provider.registerService(
      this.app.get<DubboProviderBase>(DubboProvider),
      {
        interface: dubboMetadata.interfaceName as string,
        methods: methodsArr,
      }
    );

    // assert.ok(dubbo.registryType && dubbo.registryName, 'dubbo provider must use @dubbo.registry decorator');
    // if (!this.registries.has(dubbo.registryName as RegistryType)) {
    //   const options = this.app.get('config').get(`dubbo.${dubbo.registryName}`);
    //   assert.ok(options && options.host, 'dubbo registry connection unknow');
    //   const registry: Registry = this.getRegistry(dubbo.registryType as RegistryType, options) as Registry;
    //   await registry.connect();
    //   this.registries.set(registryName)
    // }
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