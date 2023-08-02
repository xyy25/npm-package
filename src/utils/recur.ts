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

type DependencyType = 'norm' | 'dev' | 'peer';
class QueueItem {
    constructor(
        public id: string, // 包名
        public range: string, // 需要的版本范围
        public by: string, // 包的需求所属
        public type: DependencyType, // 包的依赖类型
        public optional: boolean, // 当前包是否为可选
        public depth: number, // 当前深度
        public path: string,
        public target: DepResult
    ) {}
};

// 广度优先搜索node_modules的主函数
function read(
    pkgRoot: string,
    depth: number = Infinity,
    norm: boolean = true, // 包含dependencies
    dev: boolean = true, // 包含devDependencies
    peer: boolean = true, // 包含peerDependencies
    pkgCount?: number
): DepResult {
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    if (
        depth <= 0 || 
        !fs.existsSync(pkgRoot) || 
        !fs.existsSync(abs(PACKAGE_JSON))
    ) { return {}; }
    const rootPkgJson = readPackageJson(abs(PACKAGE_JSON));
    const { 
        dependencies: rootDeps,
        devDependencies: rootDevDeps, 
        peerDependencies: rootPeerDeps,
        peerDependenciesMeta: rootPeerMeta
    } = rootPkgJson;
    const allDeps = {
        norm: norm && rootDeps ? rootDeps : {},
        dev: dev && rootDevDeps ? rootDevDeps : {},
        peer: peer && rootPeerDeps ? rootPeerDeps : {}
    }

    if(!Object.keys(allDeps).length) {
        return {};
    }

    // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
    const hash: Set<string> = new Set();
    const res: DepResult = {};
    let notFound = 0, optionalNotMeet = 0;

    const bar = pkgCount !== undefined ?
        new ProgressBar(':current/:total [:bar] Q[:queue] :nowComplete', {
            total: pkgCount,
            width: 40
        }) : null; 

    // 广度优先搜索队列
    const queue: QueueItem[] = [];
    Object.entries(allDeps).forEach((scope) => queue.push(
        ...Object.entries(scope[1]).map(e =>
            new QueueItem(e[0], e[1], 'ROOT', scope[0] as DependencyType, { 
                norm: false, dev: false,
                peer: rootPeerMeta?.[e[0]]?.optional ?? false
            }[scope[0]], 1, join(sep, NODE_MODULES), res)
    )))

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
                const {
                    dependencies: pkgDeps,
                    peerDependencies: pkgPeerDeps,
                    peerDependenciesMeta: pkgPeerMeta
                } = pkg;

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
                            p.depth <= depth && (
                                pkgDeps && Object.keys(pkgDeps).length ||
                                pkgPeerDeps && Object.keys(pkgPeerDeps).length
                        )) {
                            p.target[id].requires = {};

                            let newTasks: QueueItem[] = [];
                            const q = (e: any, type: any, optional: any) => new QueueItem(
                                e[0], e[1], itemStr, type, optional, 
                                p.depth + 1, join(pkgPath, NODE_MODULES), 
                                p.target[id].requires as DepResult
                            );
                            pkgDeps && newTasks.push(...Object.entries(pkgDeps).map((e: any) => q(e, 'norm', false)));
                            pkgPeerDeps && newTasks.push(
                                ...Object.entries(pkgPeerDeps).map(
                                    (e: any) => q(e, 'peer', pkgPeerMeta?.[e[0]]?.optional ?? false)
                            ));

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
                // 如果已到达根目录还是没找到，那说明该包的依赖未安装
                if(p.optional) {
                    optionalNotMeet++;
                } else {
                    console.error("PACKAGE", id, range, 'REQUIRED BY', by, "NOT FOUND. Have you installed it?")
                    notFound++;
                }
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
    if(optionalNotMeet) console.log(optionalNotMeet, 'optional packages not found.')
    if(notFound) console.warn(notFound, 'packages not found.');
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
