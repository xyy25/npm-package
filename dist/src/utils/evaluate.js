"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = exports.printItemStrs = exports.dirsToObj = exports.createBar = exports.QueueItem = void 0;
const chalk_1 = __importDefault(require("chalk"));
const progress_1 = __importDefault(require("progress"));
const analyze_1 = require("./analyze");
const zh_CN_json_1 = require("../lang/zh-CN.json");
const path_1 = require("path");
const _1 = require(".");
const { 'utils/evaluate.ts': desc } = zh_CN_json_1.logs;
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
        incomplete: black(' '),
        clear: true
    });
};
exports.createBar = createBar;
const dirsToObj = (dirStrs, suffices = new Array(dirStrs.length).fill('')) => {
    const splited = dirStrs.map(e => e.split(path_1.sep));
    const root = {};
    for (const [i, spDir] of splited.entries()) {
        let cur = root;
        const t = spDir.length - 1;
        for (let j = 0; j < t; j++) {
            let child = cur[spDir[j]];
            if (child === undefined || typeof child === 'string') {
                child = cur[spDir[j]] = {};
            }
            cur = child;
        }
        cur[spDir[t]] = spDir[t] + '@' + suffices[i];
    }
    return root;
};
exports.dirsToObj = dirsToObj;
const printItemStrs = (itemStrs, depth = Infinity) => {
    const dfs = (cur, d = 0, prefix = '') => {
        const keys = Object.keys(cur);
        const keylen = keys.length;
        for (const [i, key] of keys.entries()) {
            const child = cur[key];
            const pre = prefix + (i === keylen - 1 ? '└─' : '├─');
            if (typeof child === 'string') {
                const [id, version, link] = child.split('@', 3);
                console.log(pre + '─ ' + green(id) + ' ' + yellow(version) + ' ' + (link !== null && link !== void 0 ? link : ''));
                continue;
            }
            console.log(pre + (d < depth ? '┬ ' : '─ ') + cyan(key));
            if (d < depth) {
                dfs(child, d + 1, prefix + (i === keylen - 1 ? '  ' : '│ '));
            }
        }
    };
    if (typeof itemStrs[0] === 'string') {
        dfs((0, exports.dirsToObj)(itemStrs));
    }
    else {
        itemStrs = itemStrs;
        const ver = (d) => (0, _1.toDepItemWithId)(d).version;
        const linkMap = itemStrs.map((e, i) => e[1].map(d => [d + '@' + ver(e[0]), e[0].startsWith(d)])).flat();
        dfs((0, exports.dirsToObj)(linkMap.map(e => e[0]), linkMap.map(e => e[1] ? '' : '↗')));
    }
};
exports.printItemStrs = printItemStrs;
function evaluate(depEval, pkgList) {
    const notAnalyzed = [];
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
                console.warn((0, analyze_1.orange)(desc.notInHash));
                notInHash.slice(0, 8).forEach(e => console.log('-', green(e)));
                if (notInHash.length >= 8) {
                    console.warn("  ..." + desc.extra.replace("%len", yellow(notInHash.length)));
                }
                console.warn((0, analyze_1.orange)(desc.notInHash2));
            }
            notAnalyzed.push(...notInHash);
        }
        if (notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn((0, analyze_1.orange)(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.slice(0, 8).forEach(e => console.log('-', green(e)));
            if (notInList.length >= 8) {
                console.warn("  ..." + desc.extra.replace("%len", yellow(notInList.length)));
            }
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
    return notAnalyzed;
}
exports.evaluate = evaluate;
