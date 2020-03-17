/**
 * Comment
 *
 * @returns {MethodDecorator}
 */
export function application(app: string): ClassDecorator {
  return function <TFunction extends Function>(target: TFunction): TFunction {
    Reflect.defineMetadata('dubbo.application', app, target.constructor);
    return target;
  };
}