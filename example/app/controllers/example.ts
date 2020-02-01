import { Controller, route, http, inject } from '@dazejs/framework';
// import { Consumer, ZookeeperRegistry } from '../../../src';
// import java from 'js-to-java';
import DemoConsumer from '../dubbo/consumers/demo';

@route()
export default class extends Controller {


  @inject(DemoConsumer as any) demoConsumer: DemoConsumer;

  @http.get()
  async index() {
    console.log(this.demoConsumer, 'this.demoConsumer');
    const res = await this.demoConsumer.invoke('sayHello', ['xxxx']);
    console.log(res);
    return { name: 'dazejs' };
  }
}