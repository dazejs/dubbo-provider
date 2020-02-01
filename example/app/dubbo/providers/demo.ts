import { DubboProvider, dubbo } from '../../../../src';

@dubbo.registry('default')
@dubbo.interfaceName('com.daze.dubbo.service.Demo')
export default class extends DubboProvider {
  @dubbo.method()
  async sayHello(name: string) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
    return `Hello ${name}`;
  }
}