import * as decorators from './decorators';
import { Interface } from './decorators/interface';
import js2java from 'js-to-java';

export * from './registry';
export * from './dubbo-service-provider';
export * from './base';
export const dubbo = {
  ...decorators,
  interface: Interface,
};
export const java = js2java;