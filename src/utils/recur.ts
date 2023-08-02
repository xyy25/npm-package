import { join, sep } from 'path';
import { satisfies } from 'semver';
import { Dependencies, DepResult, DepItem } from './types';
import fs from 'fs';
import { readPackageJson, toString } from '.';
import ProgressBar from 'progress';

const NODE_MODULES = 'node_modules';
const PACKAGE_JSON = 'package.json';

// 深度递归搜索当前NODE_MODULES文件夹中包的总数量
export function count(
    pkgRoot: string,
    depth: number = Infinity
): number {
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    if(
        depth <= 0 || 
        !fs.existsSync(pkgRoot) || 
        !fs.existsSync(abs(NODE_MODULES))
    ) { return 0; }
    let res = 0;

    const countPkg = (pkgPath: string) => 
        res += 1 + count(abs(pkgPath), depth - 1);

    for(const pkg of fs.readdirSync(abs(NODE_MODULES))) {
        const childPath = join(NODE_MODULES, pkg)
        if(
            !fs.lstatSync(abs(childPath)).isDirectory() ||
            pkg.startsWith('.')
        ) {
            continue;
        } else if(pkg.startsWith('@')) {
            const areaPath = childPath;
            for(const areaPkg of fs.readdirSync(abs(areaPath))) {
                countPkg(join(areaPath, areaPkg));
            }
        } else {
            countPkg(childPath);
        }
    }

    return res;
}

// 广度优先搜索node_modules的主函数
function read(
    pkgRoot: string,
    dependencies: Dependencies,
    depth: number = Infinity,
    pkgCount?: number
): DepResult {
    if (
        depth <= 0 || 
        !fs.existsSync(pkgRoot) || 
        !Object.keys(dependencies).length
    ) { return {}; }
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
    const hash: Set<string> = new Set();
    const res: DepResult = {};
    let notfound = 0;

    const bar = pkgCount !== undefined ?
        new ProgressBar(':current/:total [:bar] Q[:queue] :nowComplete', {
            total: pkgCount,
            width: 40
        }) : null; 

    // 广度优先搜索队列
    type QueueItem = {
        id: string; // 包名
        range: string; // 需要的版本范围
        by: string; // 包的需求所属
        depth: number; // 当前深度
        path: string;
        target: DepResult;
    };
    const queue: QueueItem[] = Object.entries(dependencies).map((e) => {
        return {
            id: e[0],
            range: e[1],
            by: 'ROOT',
            depth: 1,
            path: join(sep, NODE_MODULES),
            target: res,
        };
    });

    while (queue.length) {
        const p = queue.shift();
        if (!p) break;
        const { id, range, by } = p;

        let pth = p.path;

        // 从内到外寻找包
        while (true) {
            const pkgPath = join(pth, id);
            const pkgJsonPath = join(pkgPath, PACKAGE_JSON);
            // console.log('current', id, range, pth);
            if (
                fs.existsSync(abs(pkgPath)) &&
                fs.existsSync(abs(pkgJsonPath))
            ) {
                const pkg = readPackageJson(abs(pkgJsonPath));

                if (pkg && (
                    range === 'latest' ||
                    satisfies(pkg.version, range)
                )) {
                    const item: DepItem = {
                        range,
                        version: pkg.version,
                        path: pth,
                    };
                    p.target[id] = item;

                    const itemStr = toString(item, id);
                    // console.log('FOUND', itemStr);

                    // 如果该包的依赖未登记入哈希
                    if(!hash.has(itemStr)) {
                        // 如果当前搜索深度未超标，则计算它的子依赖
                        if(
                            p.depth <= depth &&
                            pkg.dependencies &&
                            Object.keys(pkg.dependencies).length
                        ) {
                            p.target[id].requires = {};
                            const newTasks = Object.entries(pkg.dependencies).map(
                                (e: any) => {
                                    return {
                                        id: e[0],
                                        range: e[1],
                                        by: itemStr,
                                        depth: p.depth + 1,
                                        path: join(pkgPath, NODE_MODULES),
                                        target: p.target[id].requires as DepResult,
                                    };
                                }
                            );
                            queue.push(...newTasks);
                            //console.log(newTasks);
                            
                            //console.log('ADDED', itemStr);
                        }
                        bar?.tick({
                            'queue': queue.length,
                            'nowComplete': `${id} ${range}`
                        })
                        hash.add(itemStr);
                    }
                    break;
                }
            }

            if(!pth || pth === join(sep, NODE_MODULES)) {
                // 如果已到达根目录还是没找到，那说明该包的依赖未正确安装
                console.error("PACKAGE", id, range, 'REQUIRED BY', by, "NOT FOUND. Have you installed it?")
                notfound++;
                break;
            } else {
                // 在本目录的node_modules未找到包，则转到上级目录继续
                pth = pth.slice(
                    0,
                    pth.lastIndexOf(NODE_MODULES + sep) + NODE_MODULES.length
                );
            }
        }
    }
    console.log('\nAnalyzed', hash.size, 'packages.');
    if(notfound) console.warn(notfound, 'packages not found.');
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
