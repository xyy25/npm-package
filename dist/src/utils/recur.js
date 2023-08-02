"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const semver_1 = require("semver");
const fs_1 = __importDefault(require("fs"));
const _1 = require(".");
const NODE_MODULES = 'node_modules';
const PACKAGE_JSON = 'package.json';
// 广度优先搜索node_modules的主函数
function read(pkgRoot, dependencies, depth = Infinity) {
    if (depth <= 0 || !Object.keys(dependencies).length) {
        return {};
    }
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
    const hash = new Set();
    const res = {};
    const queue = Object.entries(dependencies).map((e) => {
        return {
            id: e[0],
            range: e[1],
            depth: 1,
            path: (0, path_1.join)(path_1.sep, NODE_MODULES),
            target: res,
        };
    });
    while (queue.length) {
        const p = queue.shift();
        if (!p)
            break;
        const { id, range } = p;
        let pth = p.path;
        // 从内到外寻找包
        while (true) {
            const pkgPath = (0, path_1.join)(pth, id);
            const pkgJsonPath = (0, path_1.join)(pkgPath, PACKAGE_JSON);
            console.log('current', id, range, pth);
            if (fs_1.default.existsSync(abs(pkgPath)) &&
                fs_1.default.existsSync(abs(pkgJsonPath))) {
                const pkg = (0, _1.readPackageJson)(abs(pkgJsonPath));
                if (pkg && (0, semver_1.satisfies)(pkg.version, range)) {
                    const item = {
                        range,
                        version: pkg.version,
                        path: pth,
                    };
                    p.target[id] = item;
                    const itemStr = (0, _1.toString)(item, id);
                    console.log('FOUND', itemStr);
                    if (hash.has(itemStr)) {
                        break;
                    }
                    // 如果该包有未登记的依赖，且当前搜索深度未超标，则计算它的子依赖
                    if (p.depth <= depth &&
                        pkg.dependencies &&
                        Object.keys(pkg.dependencies).length &&
                        !hash.has(itemStr)) {
                        p.target[id].requires = {};
                        const newTasks = Object.entries(pkg.dependencies).map((e) => {
                            return {
                                id: e[0],
                                range: e[1],
                                depth: p.depth + 1,
                                path: (0, path_1.join)(pkgPath, NODE_MODULES),
                                target: p.target[id].requires,
                            };
                        });
                        queue.push(...newTasks);
                        //console.log(newTasks);
                        hash.add(itemStr);
                        console.log('ADDED', itemStr);
                        break;
                    }
                    //console.log(hash);
                }
            }
            // 在本目录的node_modules未找到包，则转到上级目录继续
            // 如果已到达根目录还是没找到，那说明该包的依赖未正确安装
            if (!pth || pth === path_1.sep || pth === (0, path_1.join)(path_1.sep, NODE_MODULES))
                break;
            pth = pth.slice(0, pth.lastIndexOf(NODE_MODULES + path_1.sep) + NODE_MODULES.length);
        }
        console.log('current QUEUE', queue.length);
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
