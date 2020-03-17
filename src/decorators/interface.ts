import { DubboMetadataStruct } from '../dubbo';
/**
 * Comment
 *
 * @returns {ClassDecorator}
 */
export function Interface(name: string, version?: string, group?: string): ClassDecorator {
  return function <TFunction extends Function> (target: TFunction): TFunction {
    const dubbo: DubboMetadataStruct = Reflect.getMetadata('dubbo', target) ?? {};
    dubbo.interfaceName = name;
    dubbo.interfaceVersion = version;
    dubbo.interfaceGroup = group;
    Reflect.defineMetadata('dubbo', dubbo, target);
    return target;
  };
}