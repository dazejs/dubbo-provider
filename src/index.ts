import * as decorators from './decorators';
import js2java from 'js-to-java';

export * from './registry';
export * from './dubbo-service-provider';
export * from './base';
export const dubbo = decorators;
export const java = js2java;