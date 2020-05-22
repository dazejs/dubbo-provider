import { BaseController, controller, http, inject } from '@dazejs/framework';
import DemoConsumer from '../dubbo/consumers/demo';

@controller()
export class ExampleController extends BaseController {

  @inject(DemoConsumer as any) demoConsumer: DemoConsumer;

  @http.get()
  async index() {
    const res = await this.demoConsumer.invoke('sayHello', ['yyy']);
    return res;
  }
}