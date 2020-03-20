// ts-ignore
import { DubboProvider, dubbo } from '../../../../src';

@dubbo.registry('default')
@dubbo.interface('com.alibaba.dubbo.demo.NodeDemoProvider', '1.0.0')
export default class extends DubboProvider {
  @dubbo.method()
  sayHello(name: string) {
    return `yyy Hello ${name}`;
  }
}