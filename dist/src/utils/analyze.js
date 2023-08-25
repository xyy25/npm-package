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
exports.NODE_MODULES = 'node_modules';
exports.PACKAGE_JSON = 'package.json';
const { 'utils/analyze.ts': desc } = zh_CN_json_1.logs;
exports.orange = chalk_1.default.hex('#FFA500');
const { green, cyan, yellow, yellowBright } = chalk_1.default;
// 进度条
let bar = null;
const eff = "⠁⠂⠄⡀⢀⠠⠐⠈".split('');
// 广度优先搜索node_modules函数
function analyze(pkgRoot, manager, depth = Infinity, [norm, // 包含dependencies
dev, // 包含devDependencies
peer // 包含peerDependencies
] = [true, true, true], pkgCount, // 事先扫描文件检测到的已安装包的数量，用于生成进度条
relDir = '.', // 该包如果不是根目录的主项目（默认是），则从该相对目录下的package.json开始扫描
init = {} // 可供初始化补充的返回值初值，用于继续对游离包进行依赖分析的情况，减少重复分析量
) {
    var _a, _b;
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
        tick(0, `NOT ANALYZED ${stVersion} ${stId}`);
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
    const [stSpace, stName] = (0, _1.getSpaceName)(stId);
    depEval.result[stId] = {
        space: stSpace,
        name: stName,
        version: stPkgJson.version,
        dir: (0, _1.getParentDir)(stId, relDir === '.' ? pkgRoot : relDir),
        meta: null,
        requires: {}
    };
    // 根据包管理器类型选择不同的广搜方法
    let analyzer, stDir;
    switch (manager) {
        default:
            analyzer = bfsAnalyzer;
            stDir = (0, path_1.join)(relDir, exports.NODE_MODULES);
    }
    // 广度优先搜索队列初始化
    const queue = [];
    for (const [type, deps] of Object.entries(allDeps)) {
        for (const [id, range] of Object.entries(deps)) {
            const [space, name] = (0, _1.getSpaceName)(id);
            const qItem = new evaluate_1.QueueItem(id, space, name, range, // 包id，命名空间，名字，范围
            relDir === '.' ? 'ROOT' : relDir + '@' + stPkgJson.version, type, {
                norm: false, optional: true, dev: false,
                peer: (_b = (_a = stPeerMeta === null || stPeerMeta === void 0 ? void 0 : stPeerMeta[id]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false
            }[type], 1, stDir, depEval.result[stId].requires);
            queue.push(qItem);
        }
    }
    analyzer(abs, depth, queue, depEval);
    if (relDir !== '.') {
        // console.log('+', green(stItemStr), '+' + yellowBright(edSize - stSize));
    }
    return depEval;
}
exports.default = analyze;
// npm 和 yarn 的搜索方法：从内到外
// pnpm也可以用这个方法，但比较慢，如果目录中存在部分符号链接建议用这个方法
function bfsAnalyzer(abs, depth, queue, depEval) {
    const { notFound, optionalNotMeet } = depEval;
    let p;
    while ((p = queue.shift()) !== undefined) {
        const { id, range, by } = p;
        const [space, name] = (0, _1.getSpaceName)(id);
        // 在dirList中枚举该包的所有可能安装位置（与pkgRoot的相对目录），默认为从内到外翻node_modules
        const dirList = [];
        let cur = p.dir;
        while (abs(cur).startsWith(abs())) {
            dirList.push(cur);
            const pi = cur.lastIndexOf(exports.NODE_MODULES + path_1.sep);
            if (pi === -1)
                break;
            cur = cur.slice(0, pi + exports.NODE_MODULES.length);
        }
        dirList.push('..');
        let found = false;
        // 寻找依赖包的安装位置
        for (const curDir of dirList) {
            // 对每一个包进行依赖分析，将从该包中发现的依赖加入queue
            found = analyzePackage(abs, depth, curDir, p, queue, depEval);
            if (found) {
                break;
            }
        }
        // 如果已遍历完dirList还是没找到，说明该依赖未安装
        if (!found) {
            (p.optional ? optionalNotMeet : notFound)
                .push({ id, type: p.type, range, by });
            p.target[id] = {
                space, name, version: "NOT_FOUND", dir: null,
                meta: {
                    range, type: p.type, depthEnd: p.depth > depth,
                    optional: p.optional, invalid: false, symlink: false
                }
            };
        }
    }
}
// 对每一个包进行依赖分析，将从该包中发现的依赖加入queue
function analyzePackage(abs, depth, curDir, curItem, queue, depEval, childDir) {
    const { id, by, range } = curItem;
    const { rangeInvalid, analyzed: hash } = depEval;
    const pkgDir = (0, path_1.join)(curDir, id);
    const pkgJsonDir = (0, path_1.join)(pkgDir, exports.PACKAGE_JSON);
    if (!fs_1.default.existsSync(abs(pkgDir)) ||
        !fs_1.default.existsSync(abs(pkgJsonDir))) {
        return false;
    }
    const stat = fs_1.default.lstatSync(abs(pkgDir));
    if (stat.isFile()) {
        return false;
    }
    let orgPkgDir = pkgDir, orgDir = curDir;
    // 如果目录是软链接，则对其进行特殊标记
    if (stat.isSymbolicLink()) {
        const org = fs_1.default.readlinkSync(abs(pkgDir));
        // readlink在windows和linux里表现不一样，所以这里要做区分
        if (path_1.sep === '/') { // linux下realink获取的符号链接地址是文件的相对位置
            orgPkgDir = (0, path_1.join)(curDir, id, "..", org);
        }
        else { // windows下realink获取的符号链接地址是绝对位置
            orgPkgDir = (0, path_1.relative)(abs(), org);
        }
        if (!fs_1.default.existsSync(abs(orgPkgDir))) {
            return false;
        }
        orgDir = (0, _1.getParentDir)(id, orgPkgDir);
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
        space: curItem.space,
        name: curItem.name,
        version: pkg.version,
        dir: orgDir,
        meta: {
            range,
            type: curItem.type,
            depthEnd: false,
            optional: curItem.optional,
            invalid,
            symlink: orgDir !== curDir ? curDir : false
        }
    };
    curItem.target[id] = item;
    const itemStr = (0, _1.toString)(item, id);
    // 如果该包的依赖已登记入哈希集合，则不用再搜寻
    if (hash.has(itemStr)) {
        return true;
    }
    const hasDeps = !!(pkgDeps && Object.keys(pkgDeps).length ||
        pkgOptDeps && Object.keys(pkgOptDeps).length ||
        pkgPeerDeps && Object.keys(pkgPeerDeps).length);
    // 如果当前搜索深度未超标，则计算它的子依赖
    if (curItem.depth > depth) {
        item.meta && (item.meta.depthEnd = true);
    }
    else if (hasDeps) {
        curItem.target[id].requires = {};
        const newTasks = [];
        childDir !== null && childDir !== void 0 ? childDir : (childDir = (0, path_1.join)(orgPkgDir, exports.NODE_MODULES));
        const q = (e, type, optional, [space, name] = (0, _1.getSpaceName)(e[0])) => new evaluate_1.QueueItem(e[0], space, name, e[1], itemStr, type, optional, curItem.depth + 1, childDir, curItem.target[id].requires);
        pkgDeps && newTasks.push(...Object.entries(pkgDeps).map((e) => q(e, 'norm', false)));
        pkgOptDeps && newTasks.push(...Object.entries(pkgOptDeps).map((e) => q(e, 'optional', true)));
        pkgPeerDeps && newTasks.push(...Object.entries(pkgPeerDeps).map((e) => { var _a, _b; return q(e, 'peer', (_b = (_a = pkgPeerMeta === null || pkgPeerMeta === void 0 ? void 0 : pkgPeerMeta[e[0]]) === null || _a === void 0 ? void 0 : _a.optional) !== null && _b !== void 0 ? _b : false); }));
        queue.push(...newTasks);
        //console.log(newTasks);
        //console.log('ADDED', itemStr);
    }
    hash.add(itemStr);
    tick(queue.length, `${range} ${id}`);
    return true;
}
exports.analyzePackage = analyzePackage;
const tick = (qlen, curPackage) => {
    if (!bar)
        return;
    const outLength = process.stdout.columns;
    const token = {
        'eff': eff[bar.curr % eff.length],
        'queue': qlen,
        'nowComplete': outLength <= 100 ? '' :
            (desc.nowComplete + ': ' + cyan((0, _1.limit)(curPackage, outLength * 0.2)))
    };
    bar[bar.complete ? 'render' : 'tick'](token);
};
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
