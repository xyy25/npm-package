"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = exports.createBar = exports.getParentPath = exports.QueueItem = void 0;
const chalk_1 = __importDefault(require("chalk"));
const progress_1 = __importDefault(require("progress"));
const analyze_1 = require("./analyze");
const zh_CN_json_1 = require("../lang/zh-CN.json");
const path_1 = __importDefault(require("path"));
const { 'utils/recurUtils.ts': desc } = zh_CN_json_1.logs;
const { green, cyan, yellow, yellowBright, bgMagenta, black } = chalk_1.default;
class QueueItem {
    constructor(id, // 包名
    range, // 需要的版本范围
    by, // 包的需求所属
    type, // 包的依赖类型
    optional, // 当前包是否为可选
    depth, // 当前深度
    path, target) {
        this.id = id;
        this.range = range;
        this.by = by;
        this.type = type;
        this.optional = optional;
        this.depth = depth;
        this.path = path;
        this.target = target;
    }
}
exports.QueueItem = QueueItem;
;
const getParentPath = (id, pkgPath) => path_1.default.join(pkgPath, ...id.split("/").map(() => ".."));
exports.getParentPath = getParentPath;
const createBar = (total) => {
    const outLength = process.stdout.columns;
    return new progress_1.default(`Q${green(':queue')} ${yellowBright(':current')}/${yellow(':total')}` +
        ` [:bar] ` + (outLength >= 100 ? ':nowComplete' : ''), {
        total: total,
        complete: yellowBright('▇'),
        incomplete: black(' ')
    });
};
exports.createBar = createBar;
function evaluate(depEval, pkgList) {
    const notRequired = [];
    const { depth, analyzed: hash, notFound, rangeInvalid, optionalNotMeet, scope: { norm, dev, peer } } = depEval;
    // 检查哈希表集合hash中的记录与detect结果的相差
    if (pkgList) {
        const notInHash = pkgList.filter(e => !hash.has(e)).sort();
        const notInList = [...hash].filter(e => !pkgList.includes(e)).sort();
        if (notInHash.length) {
            // 如果有元素存在于detect结果却不存在于哈希集合中
            // 说明这些元素没有被通过依赖搜索覆盖到，如果scope不是全部或者递归深度有限，这是正常现象
            if (depth < Infinity || !norm || !dev || !peer) {
                const coverage = ((1 - notInHash.length / pkgList.length) * 100).toFixed(2);
                console.log(desc.coverage
                    .replace('%d', yellowBright(depth))
                    .replace('%cv', yellowBright(coverage + '%'))
                    .replace('%len', yellow(notInHash.length)));
            }
            else {
                // 如果搜索深度为Infinity，有可能因为它们并不被任何包依赖
                console.warn((0, analyze_1.orange)(desc.notInHash.replace("%len", yellow(notInHash.length))));
                notInHash.forEach(e => console.log('-', green(e)));
                console.warn((0, analyze_1.orange)(desc.notInHash2));
            }
            notRequired.push(...notInHash);
        }
        if (notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn((0, analyze_1.orange)(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.forEach(e => console.log('-', green(e)));
        }
    }
    if (optionalNotMeet.length) {
        console.log(desc.optNotMeet.replace("%d", yellow(optionalNotMeet.length)));
    }
    if (rangeInvalid.length) {
        console.warn((0, analyze_1.orange)(desc.rangeInvalid
            .replace("%d", yellowBright(rangeInvalid.length))
            .replace("%rangeInvalid2", bgMagenta(desc.rangeInvalid2))));
        rangeInvalid.forEach(e => console.warn('-', green(e)));
    }
    if (notFound.length) {
        console.warn((0, analyze_1.orange)(desc.pkgNotFound
            .replace("%d", yellowBright(notFound.length))
            .replace("%pkgNotFound2", bgMagenta(desc.pkgNotFound2))));
        notFound.forEach(e => console.warn('-', green(e)));
        console.warn((0, analyze_1.orange)(desc.pkgNotFound3));
    }
    return notRequired;
}
exports.evaluate = evaluate;
