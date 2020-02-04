import { DubboMethodMetadataStruct } from '../dubbo';
import { Metadata } from '@dazejs/framework';
/**
 * Comment
 *
 * @returns {MethodDecorator}
 */
export function Method(): MethodDecorator {
  return function(target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const methods: Map<string, DubboMethodMetadataStruct> = Metadata.get('dubbo.methods', target.constructor) ?? new Map();
    methods.set(propertyKey.toString(), {
      method: propertyKey.toString()
    });
    Metadata.set('dubbo.methods', methods, target.constructor);
    return descriptor;
  };
}

export function method(): MethodDecorator {
  return Method();
}