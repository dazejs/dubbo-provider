import { Application, inject, Loader, provide } from '@dazejs/framework';
import { Dubbo } from './dubbo';
import { DubboConsumerType, DubboProviderType } from './symbols';

export class DubboServiceProvider {
  /**
   * dazejs application instance
   */
  app: Application;

  /**
   * inject dazejs loader
   */
  @inject('loader') loader: Loader;

  /**
   * Create Dazejs Provider
   * @param app 
   */
  constructor(app: Application) {
    this.app = app;
  }

  /**
   * provide Dubbo instance
   * @param app 
   */
  @provide()
  dubbo(app: Application) {
    return new Dubbo(app); 
  }
  
  /**
   * run launch hook
   */
  async launch() {
    await this.registerProviders();
    await this.registerConsumers();
  }

  /**
   * register dubbo providers
   */
  async registerProviders() {
    const dubbo = this.app.get<Dubbo>('dubbo');
    const providers = this.loader.getComponentByType(DubboProviderType) || [];
    for (const Provider of providers) {
      const name = Reflect.getMetadata('name', Provider);
      this.app.multiton(Provider, Provider);
      if (name) {
        this.app.multiton(`dubbo.provider.${name}`, (...args: any[]) => {
          return this.app.get(Provider, args);
        }, true);
      }
      await dubbo.registerProvider(Provider);
    }
  }

  /**
   * register dubbo consumers
   */
  async registerConsumers() {
    const dubbo = this.app.get<Dubbo>('dubbo');
    const consumers = this.loader.getComponentByType(DubboConsumerType) || [];
    for (const Consumer of consumers) {
      const name = Reflect.getMetadata('name', Consumer);
      this.app.singleton(Consumer, Consumer);
      if (name) {
        this.app.singleton(`dubbo.consumer.${name}`, (...args: any[]) => {
          return this.app.get(Consumer, args);
        }, true);
      }
      await dubbo.registerConsumer(Consumer);
    }
  }
}