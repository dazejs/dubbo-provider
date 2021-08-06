import { DubboMetadataStruct } from '../dubbo';
/**
 * Comment
 *
 * @returns {ClassDecorator}
 */
export function ip(ip: string): ClassDecorator {
  return function <TFunction extends Function> (target: TFunction): TFunction {
    const dubbo: DubboMetadataStruct = Reflect.getMetadata('dubbo', target) ?? {};
    dubbo.customIP = ip;
    Reflect.defineMetadata('dubbo', dubbo, target);
    return target;
  };
}