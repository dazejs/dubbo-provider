import { Controller, route, http } from '@dazejs/framework';
import { Consumer, ZookeeperRegistry } from '../../../src';
// import java from 'js-to-java';


@route()
export default class extends Controller {
  @http.get()
  async index() {
    const zk = new ZookeeperRegistry({
      host: 'zookeeper:2181'
    });

    await zk.connect();

    const consumer = new Consumer({
      registry: zk
    });

    const invorker = await consumer.get('com.daze.dubbo.service.Demo');
    const res = await invorker?.invoke('sayHello', ['xxxxxx']);
    console.log(res, 'res - con');
    return { name: 'dazejs' };
  }
}