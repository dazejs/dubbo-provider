// ts-ignore
import { DubboConsumer, dubbo } from '../../../../../src';

@dubbo.registry('default')
  @dubbo.interfaceName('com.alibaba.dubbo.demo.DemoProvider')
export default class extends DubboConsumer {
}