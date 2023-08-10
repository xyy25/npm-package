import path, { join, relative, sep } from 'path';
import { satisfies } from 'semver';
import fs from 'fs';
import chalk from 'chalk';
import ProgressBar from 'progress';

import { logs } from "../lang/zh-CN.json";
import { QueueItem, createBar } from './recurUtils';
import { DepResult, DepItem, DepEval, DependencyType, PackageManager } from './types';
import { limit, readPackageJson, toString } from '.';
import doPnpmBfs from './pnpmAnalyze'

export const NODE_MODULES = 'node_modules';
export const PACKAGE_JSON = 'package.json';

const { 'utils/analyze.ts': desc } = logs;
export const orange = chalk.hex('#FFA500');
const { green, cyan, yellow, yellowBright } = chalk;

// 进度条
let bar: ProgressBar | null = null;
const eff: string[] = "⠁⠂⠄⡀⢀⠠⠐⠈".split('');

// 广度优先搜索node_modules函数
export default function analyze(
    pkgRoot: string,
    manager: PackageManager,
    depth: number = Infinity,
    norm: boolean = true, // 包含dependencies
    dev: boolean = true, // 包含devDependencies
    peer: boolean = true, // 包含peerDependencies
    pkgCount?: number
): DepEval {
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    const depEval: DepEval = { 
        // 分析结果
        result: {},
        depth, 
        scope: { norm, dev, peer },
        // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
        analyzed: new Set<string>(),
        // 统计未找到的包、版本不符合要求的包、可选且未安装的包
        notFound: [], 
        rangeInvalid: [],
        optionalNotMeet: []
    };

    if (
        depth <= 0 || 
        !fs.existsSync(pkgRoot) || 
        !fs.existsSync(abs(PACKAGE_JSON))
    ) { return depEval; }

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

    // 初始化控制台进度条
    bar = pkgCount !== undefined ? createBar(pkgCount) : null;

    // 广度优先搜索队列初始化
    const queue: QueueItem[] = [];
    Object.entries(allDeps).forEach(([type, deps]) => queue.push(
        ...Object.entries(deps).map(([id, range]) =>
            new QueueItem(id, range, 'ROOT', type as DependencyType, { 
                norm: false, optional: true, dev: false,
                peer: rootPeerMeta?.[id]?.optional ?? false
            }[type], 1, NODE_MODULES, depEval.result
    ))));

    if(manager === 'pnpm') {
        while(queue.length) {
            doPnpmBfs(abs, depth, queue, depEval);
        }
    } else {
        while (queue.length) {
            doBfs(abs, depth, queue, depEval);
        }
    }
    
    console.log(cyan('\n' + desc.analyzed.replace("%d", yellowBright(depEval.analyzed.size))));
    return depEval;
}

// npm 和 yarn 的搜索方法：从内到外
function doBfs(
    abs: (...path: string[]) => string,
    depth: number,
    queue: QueueItem[],
    depEval: DepEval
) {
    const { notFound, optionalNotMeet } = depEval;

    const p = queue.shift();
    if (!p) return;
    const { id, range, by } = p;
    let pth = p.path;

    // 寻找依赖包的安装位置
    while (true) {
        // console.log('current', id, range, pth);
        // 对每一个包进行依赖分析
        if(analyzePackage(abs, depth, pth, join(pth, id, NODE_MODULES), p, queue, depEval)) {
            break;
        }

        if(!pth || pth === sep || pth === NODE_MODULES) {
            const type = p.type === 'norm' ? '' : p.type;
            // 如果已到达根目录还是没找到，说明该依赖未安装
            (p.optional ? optionalNotMeet : notFound)
                .push(`${id} ${range} ${type} REQUIRED BY ${by}`);
            p.target[id] = {
                version: "NOT_FOUND", path: null, 
                meta: { 
                    range, type: p.type,  depthEnd: p.depth > depth,
                    optional: p.optional, invalid: false
                }
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

// 对每一个包进行依赖分析
export function analyzePackage(
    abs: (...path: string[]) => string,
    depth: number,
    curPath: string,
    childPath: string,
    curItem: QueueItem,
    queue: QueueItem[],
    depEval: DepEval,
): boolean {
    const { id, by, range } = curItem;
    const { rangeInvalid, analyzed: hash } = depEval;

    const pkgPath = join(curPath, id);
    const pkgJsonPath = join(pkgPath, PACKAGE_JSON);

    if (
        !fs.existsSync(abs(pkgPath)) ||
        !fs.existsSync(abs(pkgJsonPath))
    ) { return false; }

    const pkg = readPackageJson(abs(pkgJsonPath));
    if (!pkg) {
        return false;
    }
    const {
        dependencies: pkgDeps,
        optionalDependencies: pkgOptDeps,
        peerDependencies: pkgPeerDeps,
        peerDependenciesMeta: pkgPeerMeta
    } = pkg;

    let invalid = false;
    // 如果该包版本不符合range要求
    if (range !== 'latest' && !satisfies(pkg.version, range)) {
        invalid = true;
        rangeInvalid.push(`${id} REQUIRED ${range} BUT ${pkg.version} BY ${by}`);
    }
    
    const item: DepItem = {
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

    const itemStr = toString(item, id);
    // console.log('FOUND', itemStr);

    // 如果该包的依赖未登记入哈希集合
    if(!hash.has(itemStr)) {
        const hasDeps = !!(
            pkgDeps && Object.keys(pkgDeps).length ||
            pkgOptDeps && Object.keys(pkgOptDeps).length ||
            pkgPeerDeps && Object.keys(pkgPeerDeps).length
        );

        if(curItem.depth > depth) {
            item.meta.depthEnd = true;
        } // 如果当前搜索深度未超标，则计算它的子依赖
        else if(hasDeps) {
            curItem.target[id].requires = {};

            let newTasks: QueueItem[] = [];

            const q = (e: [string, string], type: DependencyType, optional: boolean) =>
                new QueueItem(
                    e[0], e[1], itemStr, type, optional, 
                    curItem.depth + 1, childPath, 
                    curItem.target[id].requires as DepResult
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
            'eff': eff[bar?.curr % eff.length],
            'queue': queue.length,
            'nowComplete': outLength <= 100 ? '' : 
                (desc.nowComplete + ': ' + cyan(limit(`${range} ${id}`, outLength * 0.2)))
        })
        hash.add(itemStr);
    }
    return true;
}


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
