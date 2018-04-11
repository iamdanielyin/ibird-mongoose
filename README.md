# ibird-mongoose

Mongoose数据源插件

## 安装

```sh
npm install ibird-mongoose
```

## 引用

```js
const app = require('ibird').newApp();
const mongooseAddon = require('ibird-mongoose');

app.import(mongooseAddon, {
    mongo: 'mongodb://localhost/hello-ibird',
    metadataPath: '/metadata',
    dir: __dirname + '/models'
});
```
## 插件信息

- **命名空间** - ibird-mongoose
- **引用参数**
  - `mongo` - 可选，字符串或对象类型，表示MongoDB连接信息，默认取`app.c().mongo`
  - `metadataPath` - 可选，字符串类型，JSON-Schema格式的模型元数据路由
  - `dir` - 可选，字符串类型，数据模型文件所在目录，指定后，该目录下所有文件都会被自动挂载
  - `metadataGetter` - 可选，函数类型，元数据列表获取函数，默认为`() => app.c().models`
  - `modelGetter` - 可选，函数类型，模型实例获取函数，默认为`name => mongoose.model(name)`
  - `tombstoneKeyGetter` - 可选，函数类型，返回逻辑删除字段的对应`key`
  - `defaultRoutePrefix` - 可选，模型API的接口前缀，字符串类型，默认为空
- **API**
  - `model(obj)` - 挂载单个模型（obj为对象类型，格式见**模型对象**一节）
  - `modelDir(dir)` - 指定模型目录，应用启动时将自动挂载，支持递归

## 模型对象

### 对象结构

- **name** - 模型名称，必填
- **displayName** - 模型显示名，必填
- **schema** - 模型结构（这里为mongoose.Schema实例），必填
- **routeHooks** - 模型API钩子，非必填
  - `list`
    - `pre` - 前置处理，函数或函数数组类型（函数支持async），接收参数为`{ ctx, query }`，query为查询对象（这里为mongoose.Query实例）
    - `post` - 后置处理，函数或函数数组类型（函数支持async），接收参数为`{ ctx, data }`，data为请求响应体
  - `id`
    - `pre` - 同上，接收参数为`{ ctx, args }`
    - `post` - 同上
  - `create`
    - `pre` - 同上，接收参数为`{ ctx }`
    - `post` - 同上
  - `update`
    - `pre` - 同上，接收参数为`{ ctx, data }`，data为请求体
    - `post` - 同上
  - `remove`
    - `pre` - 同上，接收参数为`{ ctx, data }`，data为请求体
    - `post` - 同上
- **routeSwitch** - 对象类型（`key`可选值为list、id、create、update和remove；`value`为布尔类型，当为true时才表示挂载），需要指定需要挂载的模型API，默认不挂载任何API

### 调用方式

- 当使用`app.model`API时：

```js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const defineSchema = new Schema({
    username: {
        type: String,
        displayName: '账号',
        unique: true,
        required: '账号不能为空',
        index: true
    },
    password: {
        type: String,
        displayName: '密码',
        required: '密码不能为空'
    }
});

app.model({
    name: 'User',
    displayName: '用户档案',
    schema: defineSchema,
});
```

- 当使用`app.modelDir`API时：

```js
// User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const defineSchema = new Schema({
    username: {
        type: String,
        displayName: '账号',
        unique: true,
        required: '账号不能为空',
        index: true
    },
    password: {
        type: String,
        displayName: '密码',
        required: '密码不能为空'
    },
    roles: [{
        type: Schema.Types.ObjectId,
        ref: 'Role',
        displayName: '关联角色'
    }]
});

module.exports = {
    name: 'User',
    displayName: '用户档案',
    schema: defineSchema,
};


// Role.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const defineSchema = new Schema({
    name: {
        type: String,
        displayName: '角色名称',
        unique: true,
        required: '角色名称不能为空'
    },
    type: {
        type: String,
        displayName: '角色类型',
        enum: ['业务角色', '管理角色'],
        default: '业务角色'
    },
    permissions: [{
        type: Schema.Types.ObjectId,
        ref: 'Permission',
        displayName: '关联权限'
    }]
});

module.exports = {
    name: 'Role',
    displayName: '角色',
    schema: defineSchema
};
```

> Tips：模型目录下未按指定格式导出的文件将会被忽略，也不会报错；文件名对模型挂载无任何影响，模型名最终以`name`参数为准，但为便于查找，我们建议模型名称与文件名保持一致。

## 相关模块

- **[koa-json-rest](https://github.com/yinfxs/koa-json-rest)** - 模型API的Koa中间件，为数据模型提供控制层的增删改查的功能
- **[ibird-mongoose-adapter](https://github.com/yinfxs/ibird-mongoose-adapter)** - Mongoosee数据源模块，封装持久层的增删改查以供上层调用
- **[mongoose-schema-2-json-schema](https://github.com/yinfxs/mongoose-schema-2-json-schema)** - 将Mongoosee的Schema转换为JSON-Schema格式