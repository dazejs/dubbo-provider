// ts-ignore
import { DubboProvider, dubbo } from '../../../../src';

@dubbo.registry('default')
@dubbo.interface('com.daze.dubbo.service.Demo')
export default class extends DubboProvider {
  @dubbo.method()
  sayHello(name: string) {
    return `Hello ${name}`;
  }
}