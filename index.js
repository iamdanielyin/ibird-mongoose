const mongoose = require('mongoose');
const utility = require('ibird-utils');
const rest = require('koa-json-rest');
const jsonSchema = require('mongoose-schema-2-json-schema');
const adapter = require('ibird-mongoose-adapter');
const namespace = 'ibird-mongoose';
const ctx = {};

// Use native promises
mongoose.Promise = global.Promise;

/**
 * 插件加载
 * @param app
 * @param options
 */
function onLoad(app, options) {
    ctx.app = app;
    ctx.options = options || {};
    
    const config = app.c();
    let mongo = config.mongo;
    if (typeof mongo === 'string') {
        mongo = {
            uri: mongo,
            opts: {
                useMongoClient: true
            }
        };
    }
    mongoose.connect(mongo.uri, mongo.opts);
    app.config({ models: {} });
}

/**
 * 应用启动
 * @param app
 */
function onPlay(app) {
    mountRoutes(app);
}

/**
 * 判断入参是否为函数类型
 * @param {function} fn
 */
function isFunction(fn) {
    return typeof fn === 'function' ? true : false;
}

/**
 * 挂载模型默认接口
 * @param {Object} app - 应用对象
 */
function mountRoutes(app) {
    const config = app.c();
    const options = ctx.options;
    const metadataGetter = isFunction(options.metadataGetter) || (() => config.models);
    const tombstoneKeyGetter = isFunction(options.tombstoneKeyGetter) || (ctx.tombstoneKeys ? (name => ctx.tombstoneKeys ? ctx.tombstoneKeys[name] : null) : null);
    // 数据适配器
    const modelGetter = isFunction(options.modelGetter) || (name => mongoose.model(name));
    const dataAdapter = adapter(modelGetter, {
        metadataGetter,
        tombstoneKeyGetter
    });
    // RESTful接口
    rest(metadataGetter, dataAdapter, {
        router: app.router,
        routePrefix: options.defaultRoutePrefix || config.defaultRoutePrefix,
        getLocaleString: app.getLocaleString
    });
}

/**
 * 挂载模型
 * @param obj
 */
function model(obj) {
    if (!obj || !obj.name || !obj.schema) return;
    const { name, schema, collection, skipInit } = obj;
    if (obj.tombstoneKey) {
        //添加逻辑删除字段
        const isDeleted = obj.tombstoneKey || '_dr';
        ctx.tombstoneKeys = ctx.tombstoneKeys || {};
        ctx.tombstoneKeys[name] = isDeleted;
        schema.add({
            [isDeleted]: {
                type: Boolean,
                default: false
            }
        });
    }

    // Event - ibird-mongoose:model:pre
    ctx.app.emit(`${namespace}:model:pre`, obj);

    const Model = mongoose.model(name, schema, collection, skipInit);
    const { models } = ctx.app.c();
    Object.assign(obj, {
        Model,
        rawSchema: obj.schema,
        jsonSchema: jsonSchema(obj.schema)
    });
    delete obj.schema;

    // Event - ibird-mongoose:model:post
    ctx.app.emit(`${namespace}:model:post`, obj);

    models[obj.name] = obj;
    ctx.app.config({ models });
    return ctx.app;
}

/**
 * 自动挂载目录
 * @param dir
 */
function modelDir(dir) {
    utility.recursiveDir(dir, model);
    return ctx.app;
}

// 导出插件信息
module.exports = {
    namespace,
    onLoad,
    onPlay,
    enable: {
        model,
        modelDir
    }
};