import { inject, Loader, Application, provide } from '@dazejs/framework';
import { DubboProviderType, DubboConsumerType } from './symbols';
import { Dubbo } from './dubbo';
// import { Consumer } from './consumer';


export class DubboServiceProvider {
  app: Application;

  @inject('loader') loader: Loader;

  constructor(app: Application) {
    this.app = app;
  }

  @provide()
  dubbo(app: Application) {
    return new Dubbo(app); 
  }
  
  async launch() {
    await this.registerProviders();
    await this.registerConsumers();
    // await this.app.get<Dubbo>('dubbo').run();
  }

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