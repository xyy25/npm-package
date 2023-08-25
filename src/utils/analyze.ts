import { join, relative, sep } from 'path';
import { satisfies } from 'semver';
import fs from 'fs';
import chalk from 'chalk';
import ProgressBar from 'progress';

import { logs } from "../lang/zh-CN.json";
import { QueueItem, createBar } from './evaluate';
import { DepItem, DepEval, DependencyType, PackageManager } from './types';
import { getParentDir, getSpaceName, limit, readPackageJson, toString } from '.';

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
    depth: number = Infinity, [
        norm, // 包含dependencies
        dev, // 包含devDependencies
        peer // 包含peerDependencies
    ]: [boolean, boolean, boolean]
    = [true, true, true],
    pkgCount?: number, // 事先扫描文件检测到的已安装包的数量，用于生成进度条
    relDir: string = '.', // 该包如果不是根目录的主项目（默认是），则从该相对目录下的package.json开始扫描
    init: Partial<DepEval> = {} // 可供初始化补充的返回值初值，用于继续对游离包进行依赖分析的情况，减少重复分析量
): DepEval {
    const abs = (...dir: string[]): string => join(pkgRoot, ...dir);
    const depEval: DepEval = {
        pkgRoot, manager,
        // 分析结果
        result: {},
        depth, 
        scope: { norm, dev, peer },
        // 建立哈希集合，把已经解析过的包登记起来，避免重复计算子依赖
        analyzed: new Set<string>(),
        // 统计未找到的包、版本不符合要求的包、可选且未安装的包
        notFound: [], 
        rangeInvalid: [],
        optionalNotMeet: [],
        ...init
    };

    if (
        depth < 0 || 
        !fs.existsSync(abs(relDir)) || 
        !fs.existsSync(abs(relDir, PACKAGE_JSON))
    ) { return depEval; }

    const stPkgJson = readPackageJson(abs(relDir, PACKAGE_JSON));
    if(!stPkgJson) {
        return depEval;
    }
    
    const { name: stId, version: stVersion } = stPkgJson;
    const stItemStr = relDir + '@' + stVersion;
    if(depEval.analyzed.has(stItemStr)) {
        return depEval;
    } else if(relDir !== '.') {
        depEval.analyzed.add(stItemStr);
        tick(0, `NOT ANALYZED ${stVersion} ${stId}`);
    };

    const { 
        dependencies: stDeps, // 普通依赖
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
    }

    if(!Object.keys(allDeps).length) {
        return depEval;
    }  

    // 初始化控制台进度条
    bar ??= pkgCount !== undefined ? createBar(pkgCount) : null;

    const [stSpace, stName] = getSpaceName(stId);
    depEval.result[stId] = {
        space: stSpace, 
        name: stName,
        version: stPkgJson.version,
        dir: getParentDir(stId, relDir === '.' ? pkgRoot : relDir),
        meta: null,
        requires: {}
    };

    // 根据包管理器类型选择不同的广搜方法
    let analyzer, stDir: string;
    switch(manager) {
        default:
            analyzer = bfsAnalyzer;
            stDir = join(relDir, NODE_MODULES);
    }

    // 广度优先搜索队列初始化
    const queue: QueueItem[] = [];
    for(const [type, deps] of Object.entries(allDeps)) {
        for(const [id, range] of Object.entries(deps)) {
            const [space, name] = getSpaceName(id);
            const qItem = new QueueItem(
                id, space, name, range, // 包id，命名空间，名字，范围
                relDir === '.' ? 'ROOT' : relDir + '@' + stPkgJson.version, 
                type as DependencyType, { 
                    norm: false, optional: true, dev: false,
                    peer: stPeerMeta?.[id]?.optional ?? false
                }[type], 
                1, stDir, 
                depEval.result[stId].requires!
            );
            queue.push(qItem);
        }
    }

    analyzer(abs, depth, queue, depEval);

    if(relDir !== '.') {
        // console.log('+', green(stItemStr), '+' + yellowBright(edSize - stSize));
    }

    return depEval;
}

// npm 和 yarn 的搜索方法：从内到外
// pnpm也可以用这个方法，但比较慢，如果目录中存在部分符号链接建议用这个方法
function bfsAnalyzer(
    abs: (...dir: string[]) => string,
    depth: number,
    queue: QueueItem[],
    depEval: DepEval
) {
    const { notFound, optionalNotMeet } = depEval;

    let p: QueueItem | undefined;
    while((p = queue.shift()) !== undefined) {
        const { id, range, by } = p;
        const [space, name] = getSpaceName(id);

        // 在dirList中枚举该包的所有可能安装位置（与pkgRoot的相对目录），默认为从内到外翻node_modules
        const dirList = [];
        let cur = p.dir;
        while(abs(cur).startsWith(abs())) {
            dirList.push(cur);
            
            const pi = cur.lastIndexOf(NODE_MODULES + sep);
            if(pi === -1) break;
            cur = cur.slice(0, pi + NODE_MODULES.length);
        }
        dirList.push('..');

        let found = false;
        // 寻找依赖包的安装位置
        for(const curDir of dirList) {
            // 对每一个包进行依赖分析，将从该包中发现的依赖加入queue
            found = analyzePackage(abs, depth, curDir, p, queue, depEval);
            if(found) {
                break;
            }
        }

        // 如果已遍历完dirList还是没找到，说明该依赖未安装
        if(!found) {
            (p.optional ? optionalNotMeet : notFound)
                .push({ id, type: p.type, range, by });
            p.target[id] = {
                space, name, version: "NOT_FOUND", dir: null, 
                meta: { 
                    range, type: p.type,  depthEnd: p.depth > depth,
                    optional: p.optional, invalid: false, symlink: false
                }
            }
        }
    }
}

// 对每一个包进行依赖分析，将从该包中发现的依赖加入queue
export function analyzePackage(
    abs: (...dir: string[]) => string,
    depth: number,
    curDir: string,
    curItem: QueueItem,
    queue: QueueItem[],
    depEval: DepEval,
    childDir?: string
): boolean {
    const { id, by, range } = curItem;
    const { rangeInvalid, analyzed: hash } = depEval;

    const pkgDir = join(curDir, id);
    const pkgJsonDir = join(pkgDir, PACKAGE_JSON);

    if (
        !fs.existsSync(abs(pkgDir)) ||
        !fs.existsSync(abs(pkgJsonDir))
    ) { return false; }

    const stat = fs.lstatSync(abs(pkgDir));
    if(stat.isFile()) {
        return false;
    } 
    let orgPkgDir = pkgDir, orgDir = curDir;

    // 如果目录是软链接，则对其进行特殊标记
    if(stat.isSymbolicLink()) { 
        const org = fs.readlinkSync(abs(pkgDir));
        // readlink在windows和linux里表现不一样，所以这里要做区分
        if(sep === '/') { // linux下realink获取的符号链接地址是文件的相对位置
            orgPkgDir = join(curDir, id, "..", org);
        } else { // windows下realink获取的符号链接地址是绝对位置
            orgPkgDir = relative(abs(), org);
        }
        if(!fs.existsSync(abs(orgPkgDir))) {
            return false;
        }
        orgDir = getParentDir(id, orgPkgDir);
    }

    const pkg = readPackageJson(abs(pkgJsonDir));
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
        rangeInvalid.push({ 
            id, range, by,
            dir: curDir, 
            version: pkg.version, 
            type: curItem.type
        });
    }
    
    const item: DepItem = {
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

    const itemStr = toString(item, id);

    // 如果该包的依赖已登记入哈希集合，则不用再搜寻
    if(hash.has(itemStr)) {
        return true;
    }
    
    const hasDeps = !!(
        pkgDeps && Object.keys(pkgDeps).length ||
        pkgOptDeps && Object.keys(pkgOptDeps).length ||
        pkgPeerDeps && Object.keys(pkgPeerDeps).length
    );

    // 如果当前搜索深度未超标，则计算它的子依赖
    if(curItem.depth > depth) {
        item.meta && (item.meta.depthEnd = true);
    } else if(hasDeps) {
        curItem.target[id].requires = {};

        const newTasks: QueueItem[] = [];

        childDir ??= join(orgPkgDir, NODE_MODULES);
        const q = (
            e: [string, string], 
            type: DependencyType, 
            optional: boolean, 
            [space, name]: [string, string] = getSpaceName(e[0])
        ) => new QueueItem(
                e[0], space, name, e[1], 
                itemStr, type, optional, 
                curItem.depth + 1, childDir!, 
                curItem.target[id].requires!
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

    hash.add(itemStr);
    tick(queue.length, `${range} ${id}`);
    
    return true;
}

const tick = (qlen: number, curPackage: string) => {
    if(!bar) return;
    const outLength = process.stdout.columns;
    const token = {
        'eff': eff[bar.curr % eff.length],
        'queue': qlen,
        'nowComplete': outLength <= 100 ? '' : 
            (desc.nowComplete + ': ' + cyan(limit(curPackage, outLength * 0.2)))
    };
    bar[bar.complete ? 'render' : 'tick'](token);
}

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
