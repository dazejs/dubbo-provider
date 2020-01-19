import { inject, Loader, Application, provide } from '@dazejs/framework';
import { DubboProviderType } from './symbols';
import { Dubbo } from './dubbo';


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
    const providers = this.loader.getComponentByType(DubboProviderType) || [];
    for (const Provider of providers) {
      const name = Reflect.getMetadata('name', Provider);
      this.app.multiton(Provider, Provider);
      if (name) {
        this.app.multiton(`validator.${name}`, (...args: any[]) => {
          return this.app.get(Provider, args);
        }, true);
      }
      await this.app.get<Dubbo>('dubbo').registerProvider(Provider);
    }
    await this.app.get<Dubbo>('dubbo').run();
  }
}