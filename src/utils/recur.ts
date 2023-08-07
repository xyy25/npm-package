import { join, sep } from 'path';
import { satisfies } from 'semver';
import { DepResult, DepItem, DepEval, DependencyType } from './types';
import fs from 'fs';
import { limit, readPackageJson, toString } from '.';
import chalk from 'chalk';
import ProgressBar from 'progress';
import { logs } from "../lang/zh-CN.json";

const { 'utils/recur.ts': desc } = logs;
const NODE_MODULES = 'node_modules';
const PACKAGE_JSON = 'package.json';
const orange = chalk.hex('#FFA500');
const { green, cyan, yellow, yellowBright, bgMagenta, black } = chalk;

// 递归扫描当前NODE_MODULES文件夹中依赖包的安装情况
// 和analyze不同的地方在于：analyze是按照依赖的顺序分析，detect仅进行文件扫描
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

    const countPkg = (modPath: string, pkgId: string) =>  {
        const ver = readPackageJson(abs(modPath, pkgId, PACKAGE_JSON))?.version ?? '';
        const pkgStr = toString({ version: ver, path: modPath }, pkgId);
        res.add(pkgStr);
        detect(abs(modPath, pkgId), depth - 1)
            .forEach(e => res.add(join(modPath, pkgId, e)));
    }

    for(const pkgId of fs.readdirSync(abs(NODE_MODULES))) {
        const modPath = join(sep, NODE_MODULES)
        if(
            !fs.lstatSync(abs(modPath, pkgId)).isDirectory() ||
            pkgId.startsWith('.')
        ) {
            continue;
        } else if(pkgId.startsWith('@')) {
            const areaPath = join(modPath, pkgId);
            const areaPkgs = fs.readdirSync(abs(areaPath));
            for(const areaPkgId of areaPkgs) {
                if(fs.lstatSync(abs(areaPath, areaPkgId)).isDirectory())
                countPkg(areaPath, areaPkgId);
            }
        } else {
            countPkg(modPath, pkgId);
        }
    }

    return [...res];
}

export function evaluate(
    depEval: DepEval, 
    pkgList: string[],
): string[] {
    const notRequired: string[] = [];
    const { 
        depth, 
        analyzed: hash, 
        notFound,
        rangeInvalid,
        optionalNotMeet,
        scope: { norm, dev, peer }
    } = depEval;
    // 检查哈希表集合hash中的记录与detect结果的相差
    if(norm && dev && peer && pkgList) {
        const notInHash = pkgList.filter(e => !hash.has(e)).sort();
        const notInList = [...hash].filter(e => !pkgList.includes(e)).sort();
        if(notInHash.length) {
            // 如果有元素存在于detect结果却不存在于哈希集合中
            // 说明这些元素没有被通过依赖搜索覆盖到
            if(depth < Infinity) {
                const coverage = ((1 - notInHash.length / pkgList.length) * 100).toFixed(2);
                console.log(desc.coverage
                    .replace('%d', yellowBright(depth))
                    .replace('%cv', yellowBright(coverage + '%'))
                    .replace('%len', yellow(notInHash.length))
                );
            } else {
                // 如果搜索深度小于Infinity，有可能因为它们并不被任何包依赖
                console.warn(orange(desc.notInHash.replace("%len", yellow(notInHash.length))));
                notInHash.forEach(e => console.log('-', green(e)));
                console.warn(orange(desc.notInHash2));
            }
            notRequired.push(...notInHash);
        }
        if(notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn(orange(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.forEach(e => console.log('-', green(e)));
        }
    }
    if(optionalNotMeet.length) {
        console.log(desc.optNotMeet.replace("%d", yellow(optionalNotMeet.length)));
    }
    if(rangeInvalid.length) {
        console.warn(orange(desc.rangeInvalid
            .replace("%d", yellowBright(rangeInvalid.length))
            .replace("%rangeInvalid2", bgMagenta(desc.rangeInvalid2))
        ));
        rangeInvalid.forEach(e => console.warn('-', green(e)));
    }
    if(notFound.length) {
        console.warn(orange(desc.pkgNotFound
            .replace("%d", yellowBright(notFound.length))
            .replace("%pkgNotFound2", bgMagenta(desc.pkgNotFound2))
        ));
        notFound.forEach(e => console.warn('-', green(e)));
        console.warn(orange(desc.pkgNotFound3));
    }

    return notRequired;
}
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
function analyze(
    pkgRoot: string,
    depth: number = Infinity,
    norm: boolean = true, // 包含dependencies
    dev: boolean = true, // 包含devDependencies
    peer: boolean = true, // 包含peerDependencies
    pkgCount?: number
): DepEval {
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    const depEval: DepEval = { 
        result: {}, depth, 
        scope: { norm, dev, peer },
        analyzed: new Set<string>(),
        notFound: [], 
        rangeInvalid: [],
        optionalNotMeet: []
    };

    if (
        depth <= 0 || 
        !fs.existsSync(pkgRoot) || 
        !fs.existsSync(abs(PACKAGE_JSON))
    ) {  return depEval; }

    const rootPkgJson = readPackageJson(abs(PACKAGE_JSON));
    if(!rootPkgJson) {
        return depEval;
    }

    const { 
        dependencies: rootDeps, // 普通依赖
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
    }

    if(!Object.keys(allDeps).length) {
        return depEval;
    }  
    const {
        // 分析结果
        result: res,
        // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
        analyzed: hash,
        // 统计未找到的包、版本不符合要求的包、可选且未安装的包
        notFound, rangeInvalid, optionalNotMeet
    } = depEval;

    // 初始化控制台进度条
    const outLength = process.stdout.columns;
    const bar = pkgCount !== undefined ?
        new ProgressBar(
            `Q${green(':queue')} ${yellowBright(':current')}/${yellow(':total')}` +
            ` [:bar] ` + (outLength >= 100 ? ':nowComplete' : ''), {
                total: pkgCount,
                complete: yellowBright('▇'),
                incomplete: black(' ')
        }) : null; 

    // 广度优先搜索队列
    const queue: QueueItem[] = [];
    Object.entries(allDeps).forEach((scope) => queue.push(
        ...Object.entries(scope[1]).map(e =>
            new QueueItem(e[0], e[1], 'ROOT', scope[0] as DependencyType, { 
                norm: false, optional: true, dev: false,
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
                if (!pkg) {
                    continue;
                }
                const {
                    dependencies: pkgDeps,
                    optionalDependencies: pkgOptDeps,
                    peerDependencies: pkgPeerDeps,
                    peerDependenciesMeta: pkgPeerMeta
                } = pkg;

                let invalid = false;
                if (range !== 'latest' && !satisfies(pkg.version, range)) {
                    invalid = true;
                    // 如果该包版本不符合range要求
                    rangeInvalid.push(`${id} REQUIRED ${range} BUT ${pkg.version} BY ${by}`);
                }
                
                const item: DepItem = {
                    range, 
                    version: pkg.version,
                    type: p.type,
                    path: pth,
                    optional: p.optional,
                    invalid
                };
                p.target[id] = item;

                const itemStr = toString(item, id);
                // console.log('FOUND', itemStr);

                // 如果该包的依赖未登记入哈希集合
                if(!hash.has(itemStr)) {
                    // 如果当前搜索深度未超标，则计算它的子依赖
                    if(
                        p.depth <= depth && (
                            pkgDeps && Object.keys(pkgDeps).length ||
                            pkgOptDeps && Object.keys(pkgOptDeps).length ||
                            pkgPeerDeps && Object.keys(pkgPeerDeps).length
                    )) {
                        p.target[id].requires = {};

                        let newTasks: QueueItem[] = [];
                        const q = (e: any, type: DependencyType, optional: boolean) => new QueueItem(
                            e[0], e[1], itemStr, type, optional, 
                            p.depth + 1, join(pkgPath, NODE_MODULES), 
                            p.target[id].requires as DepResult
                        );
                        pkgDeps && newTasks.push(
                            ...Object.entries(pkgDeps).map((e: any) => q(e, 'norm', false))
                        );
                        pkgOptDeps && newTasks.push(
                            ...Object.entries(pkgOptDeps).map((e: any) => q(e, 'optional', true))
                        );
                        pkgPeerDeps && newTasks.push(
                            ...Object.entries(pkgPeerDeps).map(
                                (e: any) => q(e, 'peer', pkgPeerMeta?.[e[0]]?.optional ?? false)
                        ));

                        queue.push(...newTasks);
                        //console.log(newTasks);
                        //console.log('ADDED', itemStr);
                    }
                    const outLength = process.stdout.columns;
                    bar?.tick({
                        'queue': queue.length,
                        'nowComplete': outLength <= 100 ? '' : 
                            (desc.nowComplete + ': ' + cyan(limit(`${range} ${id}`, outLength * 0.2)))
                    })
                    hash.add(itemStr);
                }
                break;
            }

            if(!pth || pth === sep || pth === join(sep, NODE_MODULES)) {
                const type = p.type === 'norm' ? '' : p.type.toUpperCase();
                // 如果已到达根目录还是没找到，说明该依赖未安装
                (p.optional ? optionalNotMeet : notFound)
                    .push(`${id} ${range} ${type} REQUIRED BY ${by}`);
                p.target[id] = {
                    range, version: "NOT_FOUND", type: p.type, path: null, 
                    optional: p.optional, invalid: false
                };
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

    console.log(cyan('\n' + desc.analyzed.replace("%d", yellowBright(hash.size))));
    return depEval;
}

export default analyze;

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
