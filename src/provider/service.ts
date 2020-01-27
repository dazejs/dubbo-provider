import { Provider } from './provider';
import { URL, format as urlFormat } from 'url';
import { IP } from '../common';
import { getServiceId } from '../utils';
import { DubboProvider as DubboProviderBase } from '../base';

export interface ProviderServiceOption {
  interface: string;
  revision?: string;
  version?: string;
  group?: string;
  methods: string[];
  delay?: number;
  retries?: number;
  timeout?: number;
  description?: string;
}

export class Service {
  /**
   * provider instance
   */
  provider: Provider;

  /**
   * interface name
   */
  interfaceName: string;

  /**
   * interface version
   */
  interfaceVersion: string;

  /**
   * interface group
   */
  interfaceGroup: string;

  /**
   * interface revision
   */
  interfaceRevision: string;

  /**
   * interface methods array
   */
  interfaceMethods: string[] = [];

  /**
   * interface delay
   */
  interfaceDelay: number;

  /**
   * interface retries
   */
  interfaceRetries: number;

  /**
   * interface timeout
   */
  interfaceTimout: number;

  /**
   * method handler
   */
  handler?: DubboProviderBase;
  
  /**
   * Create Service instance
   * @param provider 
   * @param options 
   */
  constructor(provider: Provider, options: ProviderServiceOption) {
    this.provider = provider;
    this.interfaceName = options.interface;
    this.interfaceGroup = options.group ?? '-';
    this.interfaceVersion = options.version ?? '0.0.0';
    this.interfaceRevision = options.revision ?? this.interfaceVersion;
    this.interfaceMethods = options.methods ?? [];
    this.interfaceDelay = options.delay ?? -1;
    this.interfaceRetries = options.retries ?? 2;
    this.interfaceTimout = options.timeout ?? 3000;
  }

  /**
   * get service id
   */
  getId() {
    return getServiceId(this.interfaceName, this.interfaceGroup, this.interfaceVersion);
  }

  setHandler(handler: DubboProviderBase) {
    this.handler = handler;
    return this;
  }

  async register(): Promise<this> {
    const url = new URL('dubbo://');
    const ipAddress = IP.address() || '';
    url.hostname = ipAddress;
    url.port = `${this.provider.port}`;
    url.searchParams.append('anyhost', 'true');
    url.searchParams.append('application', this.provider.application);
    url.searchParams.append('category', 'providers');
    url.searchParams.append('dubbo', this.provider.version);
    url.searchParams.append('generic', 'false');
    url.searchParams.append('interface', this.interfaceName);
    url.searchParams.append('methods', this.interfaceMethods.join(','));
    url.searchParams.append('pid', `${this.provider.pid}`);
    url.searchParams.append('revision', this.interfaceRevision);
    url.searchParams.append('side', 'provider');
    url.searchParams.append('timestamp', `${Date.now()}`);
    url.searchParams.append('version', this.interfaceVersion);
    url.searchParams.append('default.delay', `${this.interfaceDelay}`);
    url.searchParams.append('default.retries', `${this.interfaceRetries}`);
    url.searchParams.append('default.timeout', `${this.interfaceTimout}`);
    if (this.interfaceGroup !== '-') url.searchParams.append('default.group', this.interfaceGroup);

    const providerUrl = urlFormat(url);

    const interfaceRootPath = `/${this.provider.root}/${this.interfaceName}`;
    const interfaceCatePath = `${interfaceRootPath}/providers`;
    const interfaceProviderPath = `${interfaceCatePath}/${encodeURIComponent(providerUrl)}`;

    await this.provider.registry.create(interfaceRootPath, '', 0);
    await this.provider.registry.create(interfaceCatePath, '', 0);
    await this.provider.registry.create(interfaceProviderPath, ipAddress, 1);
    
    return this;
  }
}