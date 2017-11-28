const mongoose = require('mongoose');
const utility = require('ibird-utils');
const rest = require('koa-json-rest');
const jsonSchema = require('mongoose-schema-2-json-schema');
const adapter = require('ibird-mongoose-adapter');
const ctx = {};

// Use native promises
mongoose.Promise = global.Promise;

/**
 * 插件加载
 * @param app
 */
function onLoad(app) {
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
    ctx.app = app;
}

/**
 * 应用启动
 * @param app
 */
function onPlay(app) {
    mountRoutes(app);
}

/**
 * 挂载模型默认接口
 * @param {Object} app - 应用对象
 */
function mountRoutes(app) {
    const config = app.c();
    const metadataGetter = config.metadataGetter || (() => config.models);
    const tombstoneKeyGetter = config.tombstoneKeyGetter ||
        (ctx.tombstoneKeys ? (name => ctx.tombstoneKeys ? ctx.tombstoneKeys[name] : null) : null);
    // 数据适配器
    config.modelGetter = (typeof config.modelGetter === 'function') ? config.modelGetter : (name => mongoose.model(name));
    const dataAdapter = adapter(config.modelGetter, {
        metadataGetter,
        tombstoneKeyGetter
    });
    // RESTful接口
    rest(metadataGetter, dataAdapter, {
        router: app.router,
        routePrefix: config.defaultRoutePrefix,
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
    const Model = mongoose.model(name, schema, collection, skipInit);
    const { models } = ctx.app.c();
    Object.assign(obj, {
        Model,
        rawSchema: obj.schema,
        jsonSchema: jsonSchema(obj.schema)
    });
    delete obj.schema;
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
    namespace: 'ibird-mongoose',
    onLoad,
    onPlay,
    enable: {
        model,
        modelDir
    }
};