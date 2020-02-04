import { DubboMetadataStruct } from '../dubbo';
import { Metadata } from '@dazejs/framework';
/**
 * Comment
 *
 * @returns {ClassDecorator}
 */
export function InterfaceName(name: string): ClassDecorator {
  return function <TFunction extends Function> (target: TFunction): TFunction {
    const dubbo: DubboMetadataStruct = Metadata.get('dubbo', target) || {};
    dubbo.interfaceName = name;
    Metadata.set('dubbo', dubbo, target);
    return target;
  };
}

export function interfaceName(name: string): ClassDecorator {
  return InterfaceName(name);
}