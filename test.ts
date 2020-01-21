import { ZookeeperRegistry, Consumer } from './src';
import java from 'js-to-java';

(async () => {
  const zk = new ZookeeperRegistry({
    host: 'zookeeper:2181'
  });

  await zk.connect();
  const c = new Consumer({
    registry: zk
  });

  const invorker = await c.get('com.alibaba.dubbo.demo.DemoProvider', '1.0.0');

  const res = await invorker?.invoke('sayHello', [
    java.String('dazejs')
  ]);

  console.log(res);

})();