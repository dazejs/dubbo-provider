import { Application } from '@dazejs/framework';
import { DubboProvider as DubboProviderBase, DubboConsumer as DubboConsumerBase } from './base';
import { ZookeeperRegistry } from './registry';
import { Registry } from './registry/registry';
// import * as assert from 'assert';
import { Provider } from './provider';
import { Consumer } from './consumer';
import { getServiceId } from './utils';

export type RegistryType = 'zookeeper'

export interface DubboMetadataStruct {
  interfaceName?: string;
  interfaceGroup?: string;
  interfaceVersion?: string;
  registry?: string;
  application?: string;
  version?: string;
  root?: string;
}

export interface DubboMethodMetadataStruct {
  method?: string;
}

export class Dubbo {
  app: Application;

  providers: Map<string, Provider> = new Map();

  consumers: Map<string, Consumer> = new Map();

  registries: Map<string, Registry> = new Map();

  constructor(app: Application) {
    this.app = app;
  }

  private async setupRegistry(registryName: string, type: RegistryType, options: any) {
    if (!this.registries.has(registryName)) {
      const registry = this.getRegistry(type, options);
      if (registry) {
        await registry.connect();
        this.registries.set(registryName, registry);
      }
    }
  }

  async registerProvider(DubboProvider: typeof DubboProviderBase) {
    // dubbo metadata
    const dubboMetadata: DubboMetadataStruct = Reflect.getMetadata('dubbo', DubboProvider) ?? {};
    const methods: Map<string, DubboMethodMetadataStruct> = Reflect.getMetadata('dubbo.methods', DubboProvider) ?? {};
    const registryName = dubboMetadata.registry ?? 'default';
    const { type = 'zookeeper', port = 20880, ...options } = this.app.get('config').get(`dubbo.${dubboMetadata.registry}`, {});

    await this.setupRegistry(registryName, type, options);

    const interfaceName = dubboMetadata.interfaceName;
    if (!interfaceName) throw new Error('The dubbo provider must have inerfaceName!');
    if (this.providers.has(interfaceName)) return;
    
    const registry = this.registries.get(registryName);
    if (!registry) throw new Error(`No registry was found with registry name: [${registryName}]!`);

    const provider = new Provider({
      registry,
      port,
      pid: process.pid
    });
    
    const dubboProvider = this.app.get<DubboProviderBase>(DubboProvider);
    const methodNames: string[] = [];
    for (const method of methods.values()) {
      if (method.method) {
        methodNames.push(method.method);
      }
    }
    provider.registerService(
      dubboProvider,
      {
        interface: interfaceName,
        methods: methodNames
      }
    );
    // this.providers.set(interfaceName, provider);
    await provider.listen();
  }

  async registerConsumer(DubboConsumer: typeof DubboConsumerBase) {
    // dubbo metadata
    const dubboMetadata: DubboMetadataStruct = Reflect.getMetadata('dubbo', DubboConsumer) ?? {};
    const registryName = dubboMetadata.registry ?? 'default';
    const { type = 'zookeeper', ...options } = this.app.get('config').get(`dubbo.${dubboMetadata.registry}`, {});
    delete options.port;
    await this.setupRegistry(registryName, type, options);

    const interfaceName = dubboMetadata.interfaceName;
    if (!interfaceName) throw new Error('The dubbo provider must have inerface name!');

    const registry = this.registries.get(registryName);
    if (!registry) throw new Error(`No registry was found with registry name: [${registryName}]!`);

    const id = getServiceId(interfaceName, dubboMetadata.interfaceGroup ?? '-', dubboMetadata.interfaceVersion ?? '0.0.0');
    const consumer = this.app.get<DubboConsumerBase>(DubboConsumer, [{
      registry,
      application: dubboMetadata.application,
      root: dubboMetadata.root,
      version: dubboMetadata.version,
      interfaceName,
      interfaceGroup: dubboMetadata.interfaceGroup,
      interfaceVersion: dubboMetadata.interfaceVersion
    }]);
    await consumer.register();
    const res = await consumer.subscribe(id);
    console.log(res, 'count');

    // const id = getServiceId(interfaceName, dubboMetadata.interfaceGroup ?? '-', dubboMetadata.interfaceVersion ?? '0.0.0');
   
    // if (!this.consumers.has(id)) {
    //   const consumer = this.app.get<DubboConsumerBase>(DubboConsumer, [{
    //     registry,
    //     application: dubboMetadata.application,
    //     root: dubboMetadata.root,
    //     version: dubboMetadata.version,
    //     interfaceName,
    //     interfaceGroup: dubboMetadata.interfaceGroup,
    //     interfaceVersion: dubboMetadata.interfaceVersion
    //   }]);
    //   await consumer.register();
    //   const count =  await consumer.subscribe(id);
    //   if (count === 0) {
    //     await consumer.close();
    //     throw new Error(`Cannot find the interface [${interfaceName}]`);
    //   }
    //   this.consumers.set(id, consumer);
    // }
    
    // const consumer = new DubboConsumer({
    //   registry,
    //   application: dubboMetadata.application,
    //   root: dubboMetadata.root,
    //   version: dubboMetadata.version,
    //   interfaceName,
    //   interfaceGroup: dubboMetadata.interfaceGroup,
    //   interfaceVersion: dubboMetadata.interfaceVersion
    // });
  }

  getRegistry(type: RegistryType, options: any): Registry | undefined {
    switch(type) {
      case 'zookeeper':
        return new ZookeeperRegistry(options);
      default:
        return;
    }
  }

  // async run() {
    
  //   // const promises: Promise<void>[] = [];
  //   // for (const [, provider] of this.providers) {
  //   //   promises.push(
  //   //     provider.listen()
  //   //   );
  //   // }
  //   // await Promise.all(promises);
  // }
}