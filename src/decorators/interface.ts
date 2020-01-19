import { DubboMetadataStruct } from '../dubbo';
/**
 * Comment
 *
 * @returns {ClassDecorator}
 */
export function InterfaceName(name: string): ClassDecorator {
  return function <TFunction extends Function> (target: TFunction): TFunction {
    const dubbo: DubboMetadataStruct = Reflect.getMetadata('dubbo', target) || {};
    dubbo.interfaceName = name;
    Reflect.defineMetadata('dubbo', dubbo, target);
    return target;
  };
}

export function interfaceName(name: string): ClassDecorator {
  return InterfaceName(name);
}