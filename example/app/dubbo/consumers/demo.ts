import { DubboConsumer, dubbo } from '../../../../src';

@dubbo.registry('default')
@dubbo.interfaceName('com.daze.dubbo.service.Demo')
export default class extends DubboConsumer {
}