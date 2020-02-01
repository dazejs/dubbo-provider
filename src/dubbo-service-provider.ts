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

    await this.app.get<Dubbo>('dubbo').run();
  }

  async registerProviders() {
    const providers = this.loader.getComponentByType(DubboProviderType) || [];
    for (const Provider of providers) {
      const name = Reflect.getMetadata('name', Provider);
      this.app.multiton(Provider, Provider);
      if (name) {
        this.app.multiton(`dubbo.provider.${name}`, (...args: any[]) => {
          return this.app.get(Provider, args);
        }, true);
      }
    }
  }

  async registerConsumers() {
    const consumers = this.loader.getComponentByType(DubboConsumerType) || [];
    for (const Consumer of consumers) {
      const name = Reflect.getMetadata('name', Consumer);
      this.app.multiton(Consumer, Consumer);
      if (name) {
        this.app.multiton(`dubbo.consumer.${name}`, (...args: any[]) => {
          return this.app.get(Consumer, args);
        }, true);
      }
    }
  }
}