import { join, sep } from 'path';
import { satisfies } from 'semver';
import { Dependencies, DepResult, DepItem } from './types';
import fs from 'fs';
import { readPackageJson, toString } from '.';
import ProgressBar from 'progress';

const NODE_MODULES = 'node_modules';
const PACKAGE_JSON = 'package.json';

// 深度递归搜索当前NODE_MODULES文件夹中包的存在数量
export function detect(
    pkgRoot: string,
    depth: number = Infinity
): string[] {
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    if(
        depth <= 0 || 
        !fs.existsSync(pkgRoot) || 
        !fs.existsSync(abs(NODE_MODULES))
    ) { return []; }
    const res: Set<string> = new Set();

    const countPkg = (pkgPath: string) =>  {
        const ver = readPackageJson(abs(join(pkgPath, PACKAGE_JSON)))?.version;
        const pkgStr = pkgPath + (ver ? '@' + ver : '');
        res.add(pkgStr);
        detect(abs(pkgPath), depth - 1)
            .forEach(e => res.add(join(pkgPath, e)));
    }

    for(const pkg of fs.readdirSync(abs(NODE_MODULES))) {
        const childPath = join(sep, NODE_MODULES, pkg)
        if(
            !fs.lstatSync(abs(childPath)).isDirectory() ||
            pkg.startsWith('.')
        ) {
            continue;
        } else if(pkg.startsWith('@')) {
            const areaPath = childPath;
            const areaPkgs = fs.readdirSync(abs(areaPath));
            for(const areaPkg of areaPkgs) {
                const areaPkgPath = join(areaPath, areaPkg);
                if(fs.lstatSync(abs(areaPkgPath)).isDirectory())
                countPkg(areaPkgPath);
            }
        } else {
            countPkg(childPath);
        }
    }

    return [...res];
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
    pkgList?: string[]
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

    const bar = pkgList !== undefined ?
        new ProgressBar(':current/:total [:bar] Q[:queue] :nowComplete', {
            total: pkgList.length,
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
    // 检查哈希表集合中的记录与detect结果的相差
    if(pkgList && hash.size != pkgList.length) {
        const notInHash = pkgList.filter(e => !hash.has(e)).sort();
        const notInList = [...hash].filter(e => !pkgList.includes(e)).sort();
        if(notInHash.length) {
            // 如果有元素存在于detect结果却不存在于哈希集合中
            // 说明这些元素没有被通过依赖搜索覆盖到，有可能它们并不被任何包依赖
            console.warn(
                'The following', 
                notInHash.length ,
                'package(s) detected in node_modules are existing but not analyzed.'
            );
            console.warn('Maybe they are not required by anyone?');
            notInHash.forEach(name => console.log('-', name));
        }
        if(notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼
            console.warn(
                'The following', 
                notInList.length ,
                'package(s) analyzed in node_modules are not detected.'
            );
            notInList.forEach(name => console.log('-', name));
        }
    }
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
