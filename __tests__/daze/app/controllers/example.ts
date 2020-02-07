import { Controller, route, http, inject } from '@dazejs/framework';
import DemoConsumer from '../dubbo/consumers/demo';
import JavaConsumer from '../dubbo/consumers/java';

@route()
export default class extends Controller {

  @inject(DemoConsumer as any) demoConsumer: DemoConsumer;

  @inject(JavaConsumer as any) javaConsumer: JavaConsumer;

  @http.get('/daze/say-hello')
  async say1() {
    const res = await this.demoConsumer.invoke('sayHello', ['dazejs']);
    return res;
  }

  @http.get('/java/say-hello')
  async say2() {
    const res = await this.javaConsumer.invoke('sayHello', ['dazejs']);
    return res;
  }
}