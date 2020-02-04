import { DubboMetadataStruct } from '../dubbo';
import { Metadata } from '@dazejs/framework';

/**
 * Comment
 *
 * @returns {ClassDecorator}
 */
export function Registry(name = 'default'): ClassDecorator {
  return function <TFunction extends Function>(target: TFunction): TFunction {
    const dubbo: DubboMetadataStruct = Metadata.get('dubbo', target) || {};
    dubbo.registry = name;
    Metadata.set('dubbo', dubbo, target);
    return target;
  };
}

export function registry(name = 'default'): ClassDecorator {
  return Registry(name);
}