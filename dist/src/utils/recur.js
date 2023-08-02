"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.count = void 0;
const path_1 = require("path");
const semver_1 = require("semver");
const fs_1 = __importDefault(require("fs"));
const _1 = require(".");
const progress_1 = __importDefault(require("progress"));
const NODE_MODULES = 'node_modules';
const PACKAGE_JSON = 'package.json';
// 深度递归搜索当前NODE_MODULES文件夹中包的总数量
function count(pkgRoot, depth = Infinity) {
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    if (depth <= 0 ||
        !fs_1.default.existsSync(pkgRoot) ||
        !fs_1.default.existsSync(abs(NODE_MODULES))) {
        return 0;
    }
    let res = 0;
    const countPkg = (pkgPath) => res += 1 + count(abs(pkgPath), depth - 1);
    for (const pkg of fs_1.default.readdirSync(abs(NODE_MODULES))) {
        const childPath = (0, path_1.join)(NODE_MODULES, pkg);
        if (!fs_1.default.lstatSync(abs(childPath)).isDirectory() ||
            pkg.startsWith('.')) {
            continue;
        }
        else if (pkg.startsWith('@')) {
            const areaPath = childPath;
            for (const areaPkg of fs_1.default.readdirSync(abs(areaPath))) {
                countPkg((0, path_1.join)(areaPath, areaPkg));
            }
        }
        else {
            countPkg(childPath);
        }
    }
    return res;
}
exports.count = count;
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
pkgCount) {
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    if (depth <= 0 ||
        !fs_1.default.existsSync(pkgRoot) ||
        !fs_1.default.existsSync(abs(PACKAGE_JSON))) {
        return {};
    }
    const rootPkgJson = (0, _1.readPackageJson)(abs(PACKAGE_JSON));
    const { dependencies: rootDeps, devDependencies: rootDevDeps, peerDependencies: rootPeerDeps, peerDependenciesMeta: rootPeerMeta } = rootPkgJson;
    const allDeps = {
        norm: norm && rootDeps ? rootDeps : {},
        dev: dev && rootDevDeps ? rootDevDeps : {},
        peer: peer && rootPeerDeps ? rootPeerDeps : {}
    };
    if (!Object.keys(allDeps).length) {
        return {};
    }
    // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
    const hash = new Set();
    const res = {};
    let notFound = 0, optionalNotMeet = 0;
    const bar = pkgCount !== undefined ?
        new progress_1.default(':current/:total [:bar] Q[:queue] :nowComplete', {
            total: pkgCount,
            width: 40
        }) : null;
    // 广度优先搜索队列
    const queue = [];
    Object.entries(allDeps).forEach((scope) => queue.push(...Object.entries(scope[1]).map(e => {
        var _a, _b;
        return new QueueItem(e[0], e[1], 'ROOT', scope[0], {
            norm: false, dev: false,
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
                const { dependencies: pkgDeps, peerDependencies: pkgPeerDeps, peerDependenciesMeta: pkgPeerMeta } = pkg;
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
                    // 如果该包的依赖未登记入哈希
                    if (!hash.has(itemStr)) {
                        // 如果当前搜索深度未超标，则计算它的子依赖
                        if (p.depth <= depth && (pkgDeps && Object.keys(pkgDeps).length ||
                            pkgPeerDeps && Object.keys(pkgPeerDeps).length)) {
                            p.target[id].requires = {};
                            let newTasks = [];
                            const q = (e, type, optional) => new QueueItem(e[0], e[1], itemStr, type, optional, p.depth + 1, (0, path_1.join)(pkgPath, NODE_MODULES), p.target[id].requires);
                            pkgDeps && newTasks.push(...Object.entries(pkgDeps).map((e) => q(e, 'norm', false)));
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
            if (!pth || pth === (0, path_1.join)(path_1.sep, NODE_MODULES)) {
                // 如果已到达根目录还是没找到，那说明该包的依赖未安装
                if (p.optional) {
                    optionalNotMeet++;
                }
                else {
                    console.error("PACKAGE", id, range, 'REQUIRED BY', by, "NOT FOUND. Have you installed it?");
                    notFound++;
                }
                break;
            }
            else {
                // 在本目录的node_modules未找到包，则转到上级目录继续
                pth = pth.slice(0, pth.lastIndexOf(NODE_MODULES + path_1.sep) + NODE_MODULES.length);
            }
        }
    }
    console.log('\nAnalyzed', hash.size, 'packages.');
    if (optionalNotMeet)
        console.log(optionalNotMeet, 'optional packages not found.');
    if (notFound)
        console.warn(notFound, 'packages not found.');
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
