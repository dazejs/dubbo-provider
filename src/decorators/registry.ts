import { DubboMetadataStruct } from '../dubbo';
// import { Metadata } from '@dazejs/framework';

/**
 * Comment
 *
 * @returns {ClassDecorator}
 */
export function registry(name = 'default'): ClassDecorator {
  return function <TFunction extends Function>(target: TFunction): TFunction {
    const dubbo: DubboMetadataStruct = Reflect.getMetadata('dubbo', target) ?? {};
    dubbo.registry = name;
    Reflect.defineMetadata('dubbo', dubbo, target);
    return target;
  };
}