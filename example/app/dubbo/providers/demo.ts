import { DubboProvider, dubbo } from '../../../../src';

@dubbo.registry('default')
@dubbo.interfaceName('com.daze.dubbo.service.Demo')
export default class extends DubboProvider {
  sayHello(name: string) {
    return `Hello ${name}`;
  }
}