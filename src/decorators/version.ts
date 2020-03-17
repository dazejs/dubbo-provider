/**
 * Comment
 *
 * @returns {MethodDecorator}
 */
export function version(version: string): ClassDecorator {
  return function <TFunction extends Function>(target: TFunction): TFunction {
    Reflect.defineMetadata('dubbo.version', version, target.constructor);
    return target;
  };
}