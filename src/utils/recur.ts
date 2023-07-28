import { join, sep } from 'path';
import { satisfies } from 'semver';
import { Dependencies, DepResult, DepItem } from './types';
import fs from 'fs';
import { readPackageJson, toString } from '.';

const NODE_MODULES = 'node_modules';
const PACKAGE_JSON = 'package.json';

// 广度优先搜索node_modules的主函数

function read(
    pkgRoot: string,
    dependencies: Dependencies,
    depth: number = Infinity
): DepResult {
    if (depth <= 0 || !Object.keys(dependencies).length) {
        return {};
    }
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
    const hash: Set<string> = new Set();
    const res: DepResult = {};

    // 广度优先搜索队列
    type QueueItem = {
        id: string; // 包名
        range: string; // 需要的版本范围
        depth: number; // 当前深度
        path: string;
        target: DepResult;
    };
    const queue: QueueItem[] = Object.entries(dependencies).map((e) => {
        return {
            id: e[0],
            range: e[1],
            depth: 1,
            path: join(sep, NODE_MODULES),
            target: res,
        };
    });

    while (queue.length) {
        const p = queue.shift();
        if (!p) break;
        const { id, range } = p;

        let pth = p.path;

        // 从内到外寻找包
        while (true) {
            const pkgPath = join(pth, id);
            const pkgJsonPath = join(pkgPath, PACKAGE_JSON);
            console.log('current', id, range, pth);
            if (
                fs.existsSync(abs(pkgPath)) &&
                fs.existsSync(abs(pkgJsonPath))
            ) {
                const pkg = readPackageJson(abs(pkgJsonPath));

                if (pkg && satisfies(pkg.version, range)) {
                    const item: DepItem = {
                        range,
                        version: pkg.version,
                        path: pth,
                    };
                    p.target[id] = item;

                    const itemStr = toString(item, id);
                    console.log('FOUND', itemStr);
                    if (hash.has(itemStr)) {
                        break;
                    }
                    // 如果该包有未登记的依赖，且当前搜索深度未超标，则计算它的子依赖
                    if (
                        p.depth <= depth &&
                        pkg.dependencies &&
                        Object.keys(pkg.dependencies).length &&
                        !hash.has(itemStr)
                    ) {
                        p.target[id].requires = {};
                        const newTasks = Object.entries(pkg.dependencies).map(
                            (e: any) => {
                                return {
                                    id: e[0],
                                    range: e[1],
                                    depth: p.depth + 1,
                                    path: join(pkgPath, NODE_MODULES),
                                    target: p.target[id].requires as DepResult,
                                };
                            }
                        );
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
            if (!pth || pth === sep || pth === join(sep, NODE_MODULES)) break;
            pth = pth.slice(
                0,
                pth.lastIndexOf(NODE_MODULES + sep) + NODE_MODULES.length
            );
        }

        console.log('current QUEUE', queue.length);
    }
    return res;
}

export default read;

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
