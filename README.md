[![GitHub issues](https://img.shields.io/github/issues/dazejs/dubbo-provider.svg)](https://github.com/dazejs/dubbo-provider/issues)
[![npm](https://img.shields.io/npm/v/@dazejs/dubbo-provider.svg)](https://www.npmjs.com/package/@dazejs/dubbo-provider)
[![npm](https://img.shields.io/npm/dm/@dazejs/dubbo-provider.svg)](https://www.npmjs.com/package/@dazejs/dubbo-provider)
[![actions](https://github.com/dazejs/dubbo-provider/workflows/Dubbo%20CI/badge.svg?branch=master)](https://github.com/dazejs/dubbo-provider/actions)
[![codecov](https://codecov.io/gh/dazejs/dubbo-provider/branch/master/graph/badge.svg)](https://codecov.io/gh/dazejs/dubbo-provider)
[![GitHub license](https://img.shields.io/github/license/dazejs/dubbo-provider.svg)](https://github.com/dazejs/dubbo-provider/blob/master/LICENSE)

<div align="center">
  <a href="https://github.com/dazejs/dubbo-provider">
    <img width="600" heigth="300" src="https://github.com/dazejs/dubbo-provider/blob/master/assets/logo.png">
  </a>  
  <h2>Dubbo</h2>
  <h4>基于 Daze.js 的 Dubbo 服务扩展</h4>
</div>

## 简介

这是一套基于 Daze.js 的 Dubbo 的扩展，提供了服务端和客户端的一整套解决方案。

## 开始

### 安装

```bash
$ npm install --save @dazejs/dubbo-provider
```

### 加载服务提供者

添加 `DubboServiceProvider` 到 `src/config/app.ts` 配置中

```ts
import { DubboServiceProvider } from '@dazejs/dubbo-provider';

export default {
  // ...
  providers: [
    // ...
    DubboServiceProvider
  ]
  // ...
}
```

### 添加/修改配置中心设置

`src/config/` 目录下创建 `dubbo.ts` 配置文件:

```ts
export default {
  default: {
    type: 'zookeeper',
    host: '127.0.0.1:2181',
  }
}
```

自定义服务器IP地址(默认自动获取,某些情况下自动获取的IP地址可能不正确), 在刚才的配置文件中新增属性：

```ts
export default {
  // ...
  ip: '100.100.100.100'
  //...
}
```

也可以使用 `@dubbo.ip('100.100.100.100')` 来为每个消费者或者提供者单独设置(优先级大于全局)

## 使用

### 服务端 (Provider)

##### 定义提供者

```ts
import { DubboProvider, dubbo } from '@dazejs/dubbo-provider';

@dubbo.registry('default')
@dubbo.interface('com.daze.dubbo.service.Demo')
@dubbo.ip('100.100.100.100') // 自定义 ip 地址，一般情况下无需使用，自动获取即可
export default class extends DubboProvider {
  @dubbo.method()
  sayHello(name: string) {
    return `Hello ${name}`;
  }
}
```

### 客户端 (Consumer)

##### 定义消费者

```ts
import { DubboConsumer, dubbo } from '@dazejs/dubbo-provider';

@dubbo.registry('default')
@dubbo.interface('com.daze.dubbo.service.Demo')
export default class extends DubboConsumer {
}
```

##### 注入并使用

```ts
import { Controller, http, inject } from '@dazejs/framework';
import { java } from '@dazejs/dubbo-provider';
import DemoConsumer from '../dubbo/consumers/demo';

export default class extends Controller {

  @inject(DemoConsumer) demoConsumer: DemoConsumer;

  @http.get()
  async index() {
    const res = await this.demoConsumer.invoke('sayHello', [java.String('dazejs')]);
    return res;
  }
}
```