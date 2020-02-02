import { Controller, route, http, inject } from '@dazejs/framework';
import DemoConsumer from '../dubbo/consumers/demo';

@route()
export default class extends Controller {

  @inject(DemoConsumer as any) demoConsumer: DemoConsumer;

  @http.get()
  async index() {
    const res = await this.demoConsumer.invoke('sayHello', ['xxxx']);
    return res;
  }
}