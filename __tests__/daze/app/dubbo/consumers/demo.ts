
// ts-ignore
import { DubboConsumer, dubbo } from '../../../../../src';

@dubbo.registry('default')
@dubbo.interface('com.daze.dubbo.service.Demo')
export default class extends DubboConsumer {
}