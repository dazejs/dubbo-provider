// ts-ignore
import { DubboConsumer, dubbo } from '../../../../src';

@dubbo.registry('default')
@dubbo.interface('com.alibaba.dubbo.demo.DemoProvider', '1.0.0')
export default class extends DubboConsumer {
}