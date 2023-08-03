"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detect = void 0;
const path_1 = require("path");
const semver_1 = require("semver");
const fs_1 = __importDefault(require("fs"));
const _1 = require(".");
const chalk_1 = __importDefault(require("chalk"));
const progress_1 = __importDefault(require("progress"));
const zh_CN_json_1 = require("../lang/zh-CN.json");
const { 'utils/recur.ts': desc } = zh_CN_json_1.logs;
const NODE_MODULES = 'node_modules';
const PACKAGE_JSON = 'package.json';
const orange = chalk_1.default.hex('#FFA500');
const { green, cyan, yellow, yellowBright, bgMagenta, black } = chalk_1.default.cyan;
// 深度递归搜索当前NODE_MODULES文件夹中包的存在数量
function detect(pkgRoot, depth = Infinity) {
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    if (depth <= 0 ||
        !fs_1.default.existsSync(pkgRoot) ||
        !fs_1.default.existsSync(abs(NODE_MODULES))) {
        return [];
    }
    const res = new Set();
    const countPkg = (pkgPath) => {
        var _a;
        const ver = (_a = (0, _1.readPackageJson)(abs((0, path_1.join)(pkgPath, PACKAGE_JSON)))) === null || _a === void 0 ? void 0 : _a.version;
        const pkgStr = pkgPath + (ver ? '@' + ver : '');
        res.add(pkgStr);
        detect(abs(pkgPath), depth - 1)
            .forEach(e => res.add((0, path_1.join)(pkgPath, e)));
    };
    for (const pkg of fs_1.default.readdirSync(abs(NODE_MODULES))) {
        const childPath = (0, path_1.join)(path_1.sep, NODE_MODULES, pkg);
        if (!fs_1.default.lstatSync(abs(childPath)).isDirectory() ||
            pkg.startsWith('.')) {
            continue;
        }
        else if (pkg.startsWith('@')) {
            const areaPath = childPath;
            const areaPkgs = fs_1.default.readdirSync(abs(areaPath));
            for (const areaPkg of areaPkgs) {
                const areaPkgPath = (0, path_1.join)(areaPath, areaPkg);
                if (fs_1.default.lstatSync(abs(areaPkgPath)).isDirectory())
                    countPkg(areaPkgPath);
            }
        }
        else {
            countPkg(childPath);
        }
    }
    return [...res];
}
exports.detect = detect;
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
;
// 广度优先搜索node_modules的主函数
function read(pkgRoot, depth = Infinity, norm = true, // 包含dependencies
dev = true, // 包含devDependencies
peer = true, // 包含peerDependencies
pkgList) {
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    if (depth <= 0 ||
        !fs_1.default.existsSync(pkgRoot) ||
        !fs_1.default.existsSync(abs(PACKAGE_JSON))) {
        return {};
    }
    const rootPkgJson = (0, _1.readPackageJson)(abs(PACKAGE_JSON));
    const { dependencies: rootDeps, // 普通依赖
    devDependencies: rootDevDeps, // 开发依赖
    peerDependencies: rootPeerDeps, // 同级依赖
    optionalDependencies: rootOptDeps, // 可选依赖
    peerDependenciesMeta: rootPeerMeta // 同级依赖属性
     } = rootPkgJson;
    const allDeps = {
        norm: norm && rootDeps ? rootDeps : {},
        optional: norm && rootOptDeps ? rootOptDeps : {},
        dev: dev && rootDevDeps ? rootDevDeps : {},
        peer: peer && rootPeerDeps ? rootPeerDeps : {},
    };
    if (!Object.keys(allDeps).length) {
        return {};
    }
    const res = {}; // 结果
    // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
    const hash = new Set();
    // 统计未安装的包和可选包
    let notFound = [], optionalNotMeet = [];
    // 初始化控制台进度条
    const bar = pkgList !== undefined ?
        new progress_1.default(`Q${green(':queue')}` + ' ' +
            `${yellowBright(':current')}/${yellow(':total')}` + ' ' +
            `[:bar]` + ' ' +
            desc.nowComplete + ': ' + cyan(':nowComplete'), {
            total: pkgList.length,
            complete: yellowBright('■'),
            incomplete: black(' ')
        }) : null;
    // 广度优先搜索队列
    const queue = [];
    Object.entries(allDeps).forEach((scope) => queue.push(...Object.entries(scope[1]).map(e => {
        var _a, _b;
        return new QueueItem(e[0], e[1], 'ROOT', scope[0], {
            norm: false, optional: true, dev: false,
            peer: (_b = (_a = rootPeerMeta === null || rootPeerMeta === void 0 ? void 0 : rootPeerMeta[e[0]]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false
        }[scope[0]], 1, (0, path_1.join)(path_1.sep, NODE_MODULES), res);
    })));
    while (queue.length) {
        const p = queue.shift();
        if (!p)
            break;
        const { id, range, by } = p;
        let pth = p.path;
        // 从内到外寻找包
        while (true) {
            const pkgPath = (0, path_1.join)(pth, id);
            const pkgJsonPath = (0, path_1.join)(pkgPath, PACKAGE_JSON);
            // console.log('current', id, range, pth);
            if (fs_1.default.existsSync(abs(pkgPath)) &&
                fs_1.default.existsSync(abs(pkgJsonPath))) {
                const pkg = (0, _1.readPackageJson)(abs(pkgJsonPath));
                const { dependencies: pkgDeps, optionalDependencies: pkgOptDeps, peerDependencies: pkgPeerDeps, peerDependenciesMeta: pkgPeerMeta } = pkg;
                if (pkg && (range === 'latest' ||
                    (0, semver_1.satisfies)(pkg.version, range))) {
                    const item = {
                        range,
                        version: pkg.version,
                        path: pth,
                    };
                    p.target[id] = item;
                    const itemStr = (0, _1.toString)(item, id);
                    // console.log('FOUND', itemStr);
                    // 如果该包的依赖未登记入哈希集合
                    if (!hash.has(itemStr)) {
                        // 如果当前搜索深度未超标，则计算它的子依赖
                        if (p.depth <= depth && (pkgDeps && Object.keys(pkgDeps).length ||
                            pkgOptDeps && Object.keys(pkgOptDeps).length ||
                            pkgPeerDeps && Object.keys(pkgPeerDeps).length)) {
                            p.target[id].requires = {};
                            let newTasks = [];
                            const q = (e, type, optional) => new QueueItem(e[0], e[1], itemStr, type, optional, p.depth + 1, (0, path_1.join)(pkgPath, NODE_MODULES), p.target[id].requires);
                            pkgDeps && newTasks.push(...Object.entries(pkgDeps).map((e) => q(e, 'norm', false)));
                            pkgOptDeps && newTasks.push(...Object.entries(pkgOptDeps).map((e) => q(e, 'optional', true)));
                            pkgPeerDeps && newTasks.push(...Object.entries(pkgPeerDeps).map((e) => { var _a, _b; return q(e, 'peer', (_b = (_a = pkgPeerMeta === null || pkgPeerMeta === void 0 ? void 0 : pkgPeerMeta[e[0]]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false); }));
                            queue.push(...newTasks);
                            //console.log(newTasks);
                            //console.log('ADDED', itemStr);
                        }
                        bar === null || bar === void 0 ? void 0 : bar.tick({
                            'queue': queue.length,
                            'nowComplete': `${id} ${range}`
                        });
                        hash.add(itemStr);
                    }
                    break;
                }
            }
            if (!pth || pth === path_1.sep || pth === (0, path_1.join)(path_1.sep, NODE_MODULES)) {
                // 如果已到达根目录还是没找到，说明该依赖未安装
                (p.optional ? optionalNotMeet : notFound)
                    .push(`${id} ${range} REQUIRED BY ${by}`);
                break;
            }
            else {
                // 在本目录的node_modules未找到包，则转到上级目录继续
                pth = pth.slice(0, pth.lastIndexOf(NODE_MODULES + path_1.sep) + NODE_MODULES.length);
            }
        }
    }
    console.log(cyan('\n' + desc.analyzed.replace("%d", yellowBright(hash.size))));
    // 检查哈希表集合hash中的记录与detect结果的相差
    if (norm && dev && peer && pkgList) {
        const notInHash = pkgList.filter(e => !hash.has(e)).sort();
        const notInList = [...hash].filter(e => !pkgList.includes(e)).sort();
        if (notInHash.length) {
            // 如果有元素存在于detect结果却不存在于哈希集合中
            // 说明这些元素没有被通过依赖搜索覆盖到
            if (depth < Infinity) {
                const coverage = ((1 - notInHash.length / pkgList.length) * 100).toFixed(2);
                console.log(desc.coverage
                    .replace('%cv', yellowBright(coverage + '%'))
                    .replace('%len', yellow(notInHash.length)));
            }
            else {
                // 如果搜索深度小于Infinity，有可能因为它们并不被任何包依赖
                console.warn(orange(desc.notInHash.replace("%len", yellow(notInHash.length))));
                notInHash.forEach(e => console.log('-', green(e)));
                console.warn(orange(desc.notInHash2));
            }
        }
        if (notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn(orange(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.forEach(e => console.log('-', green(e)));
        }
    }
    if (optionalNotMeet.length) {
        console.log(desc.optNotMeet.replace("%d", yellow(optionalNotMeet.length)));
    }
    if (notFound.length) {
        console.warn(orange(desc.pkgNotFound
            .replace("%d", yellowBright(notFound.length))
            .replace("%pkgNotFound2", bgMagenta(desc.pkgNotFound2))));
        notFound.forEach(e => console.warn('-', green(e)));
        console.warn(orange(desc.pkgNotFound3));
    }
    return res;
}
exports.default = read;
/*
返回结构大概如下：
{
    "axios": {
        version: "1.4.0",
        range: "^1.4.0",
        path: "\\node_modules",
        requires: {
            "ws": {
                version: "8.12.0",
                range: "~8.12.0",
                path: "\\node_modules\\axios\\node_modules",
                requires: { ... }
            },
            "commander": {
                version: "11.0.0",
                range: "^11.0.0",
                path: "\\node_modules",
                requires: { ... }
            }
        }
    },
    "commander": {
        version: "11.0.0",
        range: "^11.0.0",
        path: "\\node_modules",
        // 该包的requires已经在"axios"."commander".requires中被搜索过
        // 所以不再搜索
    },
    "ws": {
        version: "8.13.0",
        range: "^8.13.0",
        path: "\\node_modules",
        requires: { ... }
    }
}
*/
