import { DubboMethodMetadataStruct } from '../dubbo';
// import { Metadata } from '@dazejs/framework';
/**
 * Comment
 *
 * @returns {MethodDecorator}
 */
export function method(): MethodDecorator {
  return function(target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const methods: Map<string, DubboMethodMetadataStruct> = Reflect.getMetadata('dubbo.methods', target.constructor) ?? new Map();
    methods.set(propertyKey.toString(), {
      method: propertyKey.toString()
    });
    Reflect.defineMetadata('dubbo.methods', methods, target.constructor);
    return descriptor;
  };
}