import { Application } from '@dazejs/framework';
import { DubboConsumer as DubboConsumerBase, DubboProvider as DubboProviderBase } from './base';
import { Provider } from './provider';
import { ZookeeperRegistry } from './registry';
import { Registry } from './registry/registry';
import { getServiceId } from './utils';

/**
 * supported registry types
 */
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
  /**
   * dazejs application instance
   */
  app: Application;

  /**
   * providers
   */
  providers: Map<string, Provider> = new Map();

  /**
   * registries
   */
  registries: Map<string, Registry> = new Map();

  /**
   * Create Dubbo instance
   * @param app
   */
  constructor(app: Application) {
    this.app = app;
  }

  /**
   * auto setup registry
   * @param registryName 
   * @param type 
   * @param options 
   */
  private async setupRegistry(registryName: string, type: RegistryType, options: any) {
    if (!this.registries.has(registryName)) {
      const registry = this.getRegistry(type, options);
      if (registry) {
        await registry.connect();
        this.registries.set(registryName, registry);
      }
    }
  }

  /**
   * register a provider
   * @param DubboProvider 
   */
  async registerProvider(DubboProvider: typeof DubboProviderBase) {
    // dubbo metadata
    const dubboMetadata: DubboMetadataStruct = Reflect.getMetadata('dubbo', DubboProvider) ?? {};
    const methods: Map<string, DubboMethodMetadataStruct> = Reflect.getMetadata('dubbo.methods', DubboProvider) ?? {};
    const registryName = dubboMetadata.registry ?? 'default';
    const customIP =  this.app.get('config').get(`dubbo.ip`, '');
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
        methods: methodNames,
        version: dubboMetadata.interfaceVersion,
        group: dubboMetadata.interfaceGroup,
        customIP
      }
    );
    await provider.listen();
  }

  /**
   * register a consumer
   * @param DubboConsumer 
   */
  async registerConsumer(DubboConsumer: typeof DubboConsumerBase) {
    // dubbo metadata
    const dubboMetadata: DubboMetadataStruct = Reflect.getMetadata('dubbo', DubboConsumer) ?? {};
    const registryName = dubboMetadata.registry ?? 'default';
    const customIP =  this.app.get('config').get(`dubbo.ip`, '');
    const { type = 'zookeeper', ...options } = this.app.get('config').get(`dubbo.${dubboMetadata.registry}`, {});
    delete options.port;
    await this.setupRegistry(registryName, type, options);

    const interfaceName = dubboMetadata.interfaceName;
    if (!interfaceName) throw new Error('The dubbo consumer must have inerface name!');

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
      interfaceVersion: dubboMetadata.interfaceVersion,
      customIP
    }]);
    await consumer.register();
    await consumer.subscribe(id);
  }

  /**
   * get supported registry instance 
   * @param type 
   * @param options 
   */
  getRegistry(type: RegistryType, options: any): Registry | undefined {
    switch(type) {
      case 'zookeeper':
        return new ZookeeperRegistry(options);
      default:
        return;
    }
  }
}