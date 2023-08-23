"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = exports.printItemStrs = exports.dirsToObj = exports.createBar = exports.QueueItem = void 0;
const chalk_1 = __importDefault(require("chalk"));
const progress_1 = __importDefault(require("progress"));
const path_1 = require("path");
const analyze_1 = require("./analyze");
const zh_CN_json_1 = require("../lang/zh-CN.json");
const _1 = require(".");
const { 'utils/evaluate.ts': desc } = zh_CN_json_1.logs;
const { gray, green, cyan, yellow, yellowBright, bgMagenta, black } = chalk_1.default;
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
            if (child === undefined) {
                let flag = false;
                for (const key in cur) {
                    if (key.startsWith(spDir[j])) {
                        child = cur[key] = {};
                        flag = true;
                        break;
                    }
                }
                if (!flag) {
                    child = cur[spDir[j]] = {};
                }
            }
            if (typeof child === 'string') {
                child = cur[child] = {};
                delete cur[spDir[j]];
            }
            cur = child;
        }
        // spDir[t]的结构是'id@version'
        const [id, version] = spDir[t].split('@');
        if (id in cur) {
            cur[spDir[t]] = cur[id];
            delete cur[id];
        }
        else {
            const key = [id, version, suffices[i] || ''].join('$');
            cur[key] = key;
        }
    }
    return root;
};
exports.dirsToObj = dirsToObj;
// 在控制台打印一组包目录，一般输入的是detect的结果数组
const printItemStrs = (itemStrs, depth = Infinity) => {
    const dfs = (cur, d = 0, prefix = '') => {
        const keys = Object.keys(cur);
        const keylen = keys.length;
        for (const [i, key] of keys.entries()) {
            const child = cur[key];
            const pre = prefix + (i === keylen - 1 ? '└─' : '├─');
            const [id, version, link] = key.split('$', 3);
            const dir = (color) => color(id) + ' ' + yellow(version !== null && version !== void 0 ? version : '') + ' ' + (link !== null && link !== void 0 ? link : '');
            if (typeof child === 'string') {
                console.log(pre + '─ ' + dir(green));
                continue;
            }
            console.log(pre + (d < depth ? '┬ ' : '─ ') + dir(cyan));
            if (d < depth) {
                dfs(child, d + 1, prefix + (i === keylen - 1 ? '  ' : '│ '));
            }
        }
    };
    const ver = (e) => (0, _1.toDepItemWithId)(e).version;
    // 将(string | [string, string[]])[]映射为[string, string][]格式
    // 第一个string为目录，第二个string为链接指向的原目录，如果不是链接则为空串
    const linkMap = itemStrs.map((e, i) => typeof e === 'string' ?
        [[e, '']] :
        e[1].map(d => [d + '@' + ver(e[0]), e[0].startsWith(d) ? '' : e[0]])).flat();
    dfs((0, exports.dirsToObj)(linkMap.map(e => e[0]), linkMap.map(e => e[1] ? '-> ' + gray(e[1]) : '')));
};
exports.printItemStrs = printItemStrs;
function evaluate(depEval, pkgList, outputs) {
    const notAnalyzed = [];
    if (!outputs)
        outputs = {};
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
        outputs['unused'] = notInHash;
        outputs['notDetected'] = notInList;
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
