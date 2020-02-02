import { DubboProvider, dubbo } from '@dazejs/dubbo-provider';

@dubbo.registry('default')
@dubbo.interfaceName('com.daze.dubbo.service.Demo')
export default class extends DubboProvider {
  @dubbo.method()
  sayHello(name: string) {
    return `Hello ${name}`;
  }
}