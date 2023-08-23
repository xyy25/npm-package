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
const evaluate_1 = require("./evaluate");
const _1 = require(".");
const pnpm_1 = __importDefault(require("./pnpm"));
exports.NODE_MODULES = 'node_modules';
exports.PACKAGE_JSON = 'package.json';
const { 'utils/analyze.ts': desc } = zh_CN_json_1.logs;
exports.orange = chalk_1.default.hex('#FFA500');
const { green, cyan, yellow, yellowBright } = chalk_1.default;
// 进度条
let bar = null;
const eff = "⠁⠂⠄⡀⢀⠠⠐⠈".split('');
// 广度优先搜索node_modules函数
function analyze(pkgRoot, manager, depth = Infinity, norm = true, // 包含dependencies
dev = true, // 包含devDependencies
peer = true, // 包含peerDependencies
pkgCount, relDir = '.', // 该包如果不是根目录的主项目（默认是），则从该相对目录下的package.json开始扫描
init = {} // 可供初始化补充的返回值初值，用于继续对游离包进行依赖分析的情况，减少重复分析量
) {
    const abs = (...dir) => (0, path_1.join)(pkgRoot, ...dir);
    const depEval = Object.assign({ pkgRoot, manager, 
        // 分析结果
        result: {}, depth, scope: { norm, dev, peer }, 
        // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
        analyzed: new Set(), 
        // 统计未找到的包、版本不符合要求的包、可选且未安装的包
        notFound: [], rangeInvalid: [], optionalNotMeet: [] }, init);
    if (depth < 0 ||
        !fs_1.default.existsSync(abs(relDir)) ||
        !fs_1.default.existsSync(abs(relDir, exports.PACKAGE_JSON))) {
        return depEval;
    }
    const stPkgJson = (0, _1.readPackageJson)(abs(relDir, exports.PACKAGE_JSON));
    if (!stPkgJson) {
        return depEval;
    }
    const { name: stId, version: stVersion } = stPkgJson;
    const stItemStr = relDir + '@' + stVersion;
    if (depEval.analyzed.has(stItemStr)) {
        return depEval;
    }
    else if (relDir !== '.') {
        depEval.analyzed.add(stItemStr);
    }
    ;
    const { dependencies: stDeps, // 普通依赖
    devDependencies: stDevDeps, // 开发依赖
    peerDependencies: stPeerDeps, // 同级依赖
    optionalDependencies: stOptDeps, // 可选依赖
    peerDependenciesMeta: stPeerMeta // 同级依赖属性
     } = stPkgJson;
    const allDeps = {
        norm: norm && stDeps ? stDeps : {},
        optional: norm && stOptDeps ? stOptDeps : {},
        dev: dev && stDevDeps ? stDevDeps : {},
        peer: peer && stPeerDeps ? stPeerDeps : {},
    };
    if (!Object.keys(allDeps).length) {
        return depEval;
    }
    // 初始化控制台进度条
    bar !== null && bar !== void 0 ? bar : (bar = pkgCount !== undefined ? (0, evaluate_1.createBar)(pkgCount) : null);
    depEval.result[stId] = {
        version: stPkgJson.version,
        dir: (0, _1.getParentDir)(stId, relDir),
        meta: null,
        requires: {}
    };
    // 根据包管理器类型选择不同的广搜方法
    let analyzer, stDir;
    switch (manager) {
        case 'pnpm':
            analyzer = pnpm_1.default;
            stDir = relDir === '.' ? exports.NODE_MODULES : (0, _1.getParentDir)(stId, relDir);
            break;
        default:
            analyzer = doBfs;
            stDir = (0, path_1.join)(relDir, exports.NODE_MODULES);
    }
    // 广度优先搜索队列初始化
    const queue = [];
    Object.entries(allDeps).forEach(([type, deps]) => queue.push(...Object.entries(deps).map(([id, range]) => {
        var _a, _b;
        return new evaluate_1.QueueItem(id, range, relDir === '.' ? 'ROOT' : relDir + '@' + stPkgJson.version, type, {
            norm: false, optional: true, dev: false,
            peer: (_b = (_a = stPeerMeta === null || stPeerMeta === void 0 ? void 0 : stPeerMeta[id]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false
        }[type], 1, stDir, depEval.result[stId].requires);
    })));
    const stSize = depEval.analyzed.size;
    while (queue.length) {
        analyzer(abs, depth, queue, depEval);
    }
    const edSize = depEval.analyzed.size;
    if (relDir !== '.') {
        // console.log('+', green(stItemStr), '+' + yellowBright(edSize - stSize));
    }
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
    let curDir = p.dir;
    // 寻找依赖包的安装位置
    while (true) {
        // console.log('current', id, range, pth);
        // 对每一个包进行依赖分析
        if (analyzePackage(abs, depth, curDir, (0, path_1.join)(curDir, id, exports.NODE_MODULES), p, queue, depEval)) {
            break;
        }
        if (!curDir || curDir === path_1.sep || curDir === exports.NODE_MODULES) {
            // 如果已到达根目录还是没找到，说明该依赖未安装
            (p.optional ? optionalNotMeet : notFound)
                .push({ id, type: p.type, range, by });
            p.target[id] = {
                version: "NOT_FOUND", dir: null,
                meta: {
                    range, type: p.type, depthEnd: p.depth > depth,
                    optional: p.optional, invalid: false
                }
            };
            break;
        }
        else {
            // 在本目录的node_modules未找到包，则转到上级目录继续
            curDir = curDir.slice(0, curDir.lastIndexOf(exports.NODE_MODULES + path_1.sep) + exports.NODE_MODULES.length);
        }
    }
}
// 对每一个包进行依赖分析
function analyzePackage(abs, depth, curDir, childDir, curItem, queue, depEval) {
    const { id, by, range } = curItem;
    const { rangeInvalid, analyzed: hash } = depEval;
    const pkgDir = (0, path_1.join)(curDir, id);
    const pkgJsonDir = (0, path_1.join)(pkgDir, exports.PACKAGE_JSON);
    if (!fs_1.default.existsSync(abs(pkgDir)) ||
        !fs_1.default.existsSync(abs(pkgJsonDir))) {
        return false;
    }
    const pkg = (0, _1.readPackageJson)(abs(pkgJsonDir));
    if (!pkg) {
        return false;
    }
    const { dependencies: pkgDeps, optionalDependencies: pkgOptDeps, peerDependencies: pkgPeerDeps, peerDependenciesMeta: pkgPeerMeta } = pkg;
    let invalid = false;
    // 如果该包版本不符合range要求
    if (range !== 'latest' && !(0, semver_1.satisfies)(pkg.version, range)) {
        invalid = true;
        rangeInvalid.push({
            id, range, by,
            dir: curDir,
            version: pkg.version,
            type: curItem.type
        });
    }
    const item = {
        version: pkg.version,
        dir: curDir,
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
            item.meta && (item.meta.depthEnd = true);
        } // 如果当前搜索深度未超标，则计算它的子依赖
        else if (hasDeps) {
            curItem.target[id].requires = {};
            let newTasks = [];
            const q = (e, type, optional) => new evaluate_1.QueueItem(e[0], e[1], itemStr, type, optional, curItem.depth + 1, childDir, curItem.target[id].requires);
            pkgDeps && newTasks.push(...Object.entries(pkgDeps).map((e) => q(e, 'norm', false)));
            pkgOptDeps && newTasks.push(...Object.entries(pkgOptDeps).map((e) => q(e, 'optional', true)));
            pkgPeerDeps && newTasks.push(...Object.entries(pkgPeerDeps).map((e) => { var _a, _b; return q(e, 'peer', (_b = (_a = pkgPeerMeta === null || pkgPeerMeta === void 0 ? void 0 : pkgPeerMeta[e[0]]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false); }));
            queue.push(...newTasks);
            //console.log(newTasks);
            //console.log('ADDED', itemStr);
        }
        const outLength = process.stdout.columns;
        bar === null || bar === void 0 ? void 0 : bar.tick({
            'eff': eff[(bar === null || bar === void 0 ? void 0 : bar.curr) % eff.length],
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
        dir: "\\node_modules",
        requires: {
            "ws": {
                version: "8.12.0",
                range: "~8.12.0",
                dir: "\\node_modules\\axios\\node_modules",
                requires: { ... }
            },
            "commander": {
                version: "11.0.0",
                range: "^11.0.0",
                dir: "\\node_modules",
                requires: { ... }
            }
        }
    },
    "commander": {
        version: "11.0.0",
        range: "^11.0.0",
        dir: "\\node_modules",
        // 该包的requires已经在"axios"."commander".requires中被搜索过
        // 所以不再搜索
    },
    "ws": {
        version: "8.13.0",
        range: "^8.13.0",
        dir: "\\node_modules",
        requires: { ... }
    }
}
*/
