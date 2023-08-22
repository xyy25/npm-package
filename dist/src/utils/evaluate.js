"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = exports.createBar = exports.QueueItem = void 0;
const chalk_1 = __importDefault(require("chalk"));
const progress_1 = __importDefault(require("progress"));
const analyze_1 = __importStar(require("./analyze"));
const zh_CN_json_1 = require("../lang/zh-CN.json");
const path_1 = __importDefault(require("path"));
const _1 = require(".");
const { 'utils/recurUtils.ts': desc } = zh_CN_json_1.logs;
const { green, cyan, yellow, yellowBright, bgMagenta, black } = chalk_1.default;
class QueueItem {
    constructor(id, // 包名
    range, // 需要的版本范围
    by, // 包的需求所属
    type, // 包的依赖类型
    optional, // 当前包是否为可选
    depth, // 当前深度
    dir, target) {
        this.id = id;
        this.range = range;
        this.by = by;
        this.type = type;
        this.optional = optional;
        this.depth = depth;
        this.dir = dir;
        this.target = target;
    }
}
exports.QueueItem = QueueItem;
;
const createBar = (total) => {
    const outLength = process.stdout.columns;
    return new progress_1.default(`:eff Q${green(':queue')} ${yellowBright(':current')}/${yellow(':total')}` +
        ` [:bar] ` + (outLength >= 100 ? ':nowComplete' : ''), {
        total: total,
        head: chalk_1.default.red('▇'),
        complete: yellowBright('▇'),
        incomplete: black(' ')
    });
};
exports.createBar = createBar;
function evaluate(depEval, pkgList) {
    const notRequired = [];
    const { pkgRoot, manager, depth, analyzed: hash, notFound, rangeInvalid, optionalNotMeet, scope: { norm, dev, peer } } = depEval;
    console.log(cyan('\n' + zh_CN_json_1.logs['utils/analyze.ts'].analyzed.replace("%d", yellowBright(depEval.analyzed.size))));
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
                notRequired.push(...notInHash);
            }
            else {
                // 如果搜索深度为Infinity，有可能因为它们并不被任何包依赖
                console.warn((0, analyze_1.orange)(desc.notInHash.replace("%len", yellow(notInHash.length))));
                notInHash.forEach(e => console.log('-', green(e)));
                console.warn((0, analyze_1.orange)(desc.notInHash2));
                notRequired.push(...notInHash);
                // 弹出询问是否需要检测这些包的依赖关系
                {
                    notRequired.splice(0);
                    for (const itemStr of notInHash) {
                        const { id, dir } = (0, _1.toDepItemWithId)(itemStr);
                        const relDir = path_1.default.join(dir, id);
                        // console.log(relDir);
                        (0, analyze_1.default)(pkgRoot, manager, depth, true, false, false, pkgList.length, relDir, {
                            result: depEval.result, analyzed: hash
                        });
                    }
                    console.log(cyan('\n' + zh_CN_json_1.logs['utils/analyze.ts'].analyzed.replace("%d", yellowBright(depEval.analyzed.size))));
                    const stillNotInhash = pkgList.filter(e => !hash.has(e)).sort();
                    console.warn((0, analyze_1.orange)(desc.notInHash.replace("%len", yellow(stillNotInhash.length))));
                    stillNotInhash.forEach(e => console.log('-', green(e)));
                }
            }
        }
        if (notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn((0, analyze_1.orange)(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.forEach(e => console.log('-', green(e)));
        }
    }
    const tStr = (type) => type !== "norm" ? type + " " : "";
    const nStr = (e) => `${e.id} ${e.range} ${tStr(e.type)}REQUIRED BY ${e.by}`;
    const iStr = (e) => `${e.id} ${tStr(e.type)}REQUIRE ${e.range} BUT ${e.version} BY ${e.by}`;
    if (optionalNotMeet.length) {
        console.log(desc.optNotMeet.replace("%d", yellow(optionalNotMeet.length)));
    }
    if (rangeInvalid.length) {
        console.warn((0, analyze_1.orange)(desc.rangeInvalid
            .replace("%d", yellowBright(rangeInvalid.length))
            .replace(/%1(.*)%1/, bgMagenta("$1"))));
        rangeInvalid.forEach(e => console.warn('-', green(iStr(e))));
    }
    if (notFound.length) {
        console.warn((0, analyze_1.orange)(desc.pkgNotFound
            .replace("%d", yellowBright(notFound.length))
            .replace(/%1(.*)%1/, bgMagenta("$1"))));
        notFound.forEach(e => console.warn('-', green(nStr(e))));
        console.warn((0, analyze_1.orange)(desc.pkgNotFound2));
    }
    return notRequired;
}
exports.evaluate = evaluate;
