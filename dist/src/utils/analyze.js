"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePackage = exports.orange = exports.PACKAGE_JSON = exports.NODE_MODULES = void 0;
const path_1 = require("path");
const semver_1 = require("semver");
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const zh_CN_json_1 = require("../lang/zh-CN.json");
const recurUtils_1 = require("./recurUtils");
const _1 = require(".");
const pnpmAnalyze_1 = __importDefault(require("./pnpmAnalyze"));
exports.NODE_MODULES = 'node_modules';
exports.PACKAGE_JSON = 'package.json';
const { 'utils/analyze.ts': desc } = zh_CN_json_1.logs;
exports.orange = chalk_1.default.hex('#FFA500');
const { green, cyan, yellow, yellowBright } = chalk_1.default;
// 进度条
let bar = null;
// 广度优先搜索node_modules函数
function analyze(pkgRoot, manager, depth = Infinity, norm = true, // 包含dependencies
dev = true, // 包含devDependencies
peer = true, // 包含peerDependencies
pkgCount) {
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    const depEval = {
        // 分析结果
        result: {},
        depth,
        scope: { norm, dev, peer },
        // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
        analyzed: new Set(),
        // 统计未找到的包、版本不符合要求的包、可选且未安装的包
        notFound: [],
        rangeInvalid: [],
        optionalNotMeet: []
    };
    if (depth <= 0 ||
        !fs_1.default.existsSync(pkgRoot) ||
        !fs_1.default.existsSync(abs(exports.PACKAGE_JSON))) {
        return depEval;
    }
    const rootPkgJson = (0, _1.readPackageJson)(abs(exports.PACKAGE_JSON));
    if (!rootPkgJson) {
        return depEval;
    }
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
        return depEval;
    }
    // 初始化控制台进度条
    bar = pkgCount !== undefined ? (0, recurUtils_1.createBar)(pkgCount) : null;
    // 广度优先搜索队列初始化
    const queue = [];
    Object.entries(allDeps).forEach(([type, deps]) => queue.push(...Object.entries(deps).map(([id, range]) => {
        var _a, _b;
        return new recurUtils_1.QueueItem(id, range, 'ROOT', type, {
            norm: false, optional: true, dev: false,
            peer: (_b = (_a = rootPeerMeta === null || rootPeerMeta === void 0 ? void 0 : rootPeerMeta[id]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false
        }[type], 1, exports.NODE_MODULES, depEval.result);
    })));
    if (manager === 'pnpm') {
        while (queue.length) {
            (0, pnpmAnalyze_1.default)(abs, depth, queue, depEval);
        }
    }
    else {
        while (queue.length) {
            doBfs(abs, depth, queue, depEval);
        }
    }
    console.log(cyan('\n' + desc.analyzed.replace("%d", yellowBright(depEval.analyzed.size))));
    return depEval;
}
exports.default = analyze;
// npm 和 yarn 的搜索方法：从内到外
function doBfs(abs, depth, queue, depEval) {
    const { notFound, optionalNotMeet } = depEval;
    const p = queue.shift();
    if (!p)
        return;
    const { id, range, by } = p;
    let pth = p.path;
    // 寻找依赖包的安装位置
    while (true) {
        // console.log('current', id, range, pth);
        // 对每一个包进行依赖分析
        if (analyzePackage(abs, depth, pth, (0, path_1.join)(pth, id, exports.NODE_MODULES), p, queue, depEval)) {
            break;
        }
        if (!pth || pth === path_1.sep || pth === exports.NODE_MODULES) {
            const type = p.type === 'norm' ? '' : p.type;
            // 如果已到达根目录还是没找到，说明该依赖未安装
            (p.optional ? optionalNotMeet : notFound)
                .push(`${id} ${range} ${type} REQUIRED BY ${by}`);
            p.target[id] = {
                version: "NOT_FOUND", path: null,
                meta: {
                    range, type: p.type, depthEnd: p.depth > depth,
                    optional: p.optional, invalid: false
                }
            };
            break;
        }
        else {
            // 在本目录的node_modules未找到包，则转到上级目录继续
            pth = pth.slice(0, pth.lastIndexOf(exports.NODE_MODULES + path_1.sep) + exports.NODE_MODULES.length);
        }
    }
}
// 对每一个包进行依赖分析
function analyzePackage(abs, depth, curPath, childPath, curItem, queue, depEval) {
    const { id, by, range } = curItem;
    const { rangeInvalid, analyzed: hash } = depEval;
    const pkgPath = (0, path_1.join)(curPath, id);
    const pkgJsonPath = (0, path_1.join)(pkgPath, exports.PACKAGE_JSON);
    if (!fs_1.default.existsSync(abs(pkgPath)) ||
        !fs_1.default.existsSync(abs(pkgJsonPath))) {
        return false;
    }
    const pkg = (0, _1.readPackageJson)(abs(pkgJsonPath));
    if (!pkg) {
        return false;
    }
    const { dependencies: pkgDeps, optionalDependencies: pkgOptDeps, peerDependencies: pkgPeerDeps, peerDependenciesMeta: pkgPeerMeta } = pkg;
    let invalid = false;
    // 如果该包版本不符合range要求
    if (range !== 'latest' && !(0, semver_1.satisfies)(pkg.version, range)) {
        invalid = true;
        rangeInvalid.push(`${id} REQUIRED ${range} BUT ${pkg.version} BY ${by}`);
    }
    const item = {
        version: pkg.version,
        path: curPath,
        meta: {
            range,
            type: curItem.type,
            depthEnd: false,
            optional: curItem.optional,
            invalid
        }
    };
    curItem.target[id] = item;
    const itemStr = (0, _1.toString)(item, id);
    // console.log('FOUND', itemStr);
    // 如果该包的依赖未登记入哈希集合
    if (!hash.has(itemStr)) {
        const hasDeps = !!(pkgDeps && Object.keys(pkgDeps).length ||
            pkgOptDeps && Object.keys(pkgOptDeps).length ||
            pkgPeerDeps && Object.keys(pkgPeerDeps).length);
        if (curItem.depth > depth) {
            item.meta.depthEnd = true;
        } // 如果当前搜索深度未超标，则计算它的子依赖
        else if (hasDeps) {
            curItem.target[id].requires = {};
            let newTasks = [];
            const q = (e, type, optional) => new recurUtils_1.QueueItem(e[0], e[1], itemStr, type, optional, curItem.depth + 1, childPath, curItem.target[id].requires);
            pkgDeps && newTasks.push(...Object.entries(pkgDeps).map((e) => q(e, 'norm', false)));
            pkgOptDeps && newTasks.push(...Object.entries(pkgOptDeps).map((e) => q(e, 'optional', true)));
            pkgPeerDeps && newTasks.push(...Object.entries(pkgPeerDeps).map((e) => { var _a, _b; return q(e, 'peer', (_b = (_a = pkgPeerMeta === null || pkgPeerMeta === void 0 ? void 0 : pkgPeerMeta[e[0]]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false); }));
            queue.push(...newTasks);
            //console.log(newTasks);
            //console.log('ADDED', itemStr);
        }
        const outLength = process.stdout.columns;
        bar === null || bar === void 0 ? void 0 : bar.tick({
            'queue': queue.length,
            'nowComplete': outLength <= 100 ? '' :
                (desc.nowComplete + ': ' + cyan((0, _1.limit)(`${range} ${id}`, outLength * 0.2)))
        });
        hash.add(itemStr);
    }
    return true;
}
exports.analyzePackage = analyzePackage;
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
