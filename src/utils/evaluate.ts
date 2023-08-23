import chalk, { Chalk } from "chalk";
import ProgressBar from "progress";
import { sep } from "path";

import { DependencyType, DepEval, DepResult, InvalidItem, NotFoundItem } from "./types";
import { orange } from './analyze';
import { logs } from '../lang/zh-CN.json';
import { toDepItemWithId } from ".";

const { 'utils/evaluate.ts': desc } = logs;
const { gray, green, cyan, yellow, yellowBright, bgMagenta, black } = chalk;

export class QueueItem {
    constructor(
        public id: string, // 包名
        public range: string, // 需要的版本范围
        public by: string, // 包的需求所属
        public type: DependencyType, // 包的依赖类型
        public optional: boolean, // 当前包是否为可选
        public depth: number, // 当前深度
        public dir: string,
        public target: DepResult
    ) {}
};

export const createBar = (total: number): ProgressBar => {
    const outLength = process.stdout.columns;
    return new ProgressBar(
            `:eff Q${green(':queue')} ${yellowBright(':current')}/${yellow(':total')}` +
            ` [:bar] ` + (outLength >= 100 ? ':nowComplete' : ''), {
                total: total,
                head: chalk.red('▇'),
                complete: yellowBright('▇'),
                incomplete: black(' '),
                clear: true
        }); 
}

export type DirObj = { 
    [dirName: string]: DirObj | string
}

export const dirsToObj = (
    dirStrs: string[], 
    suffices: string[] = new Array(dirStrs.length).fill('')
): DirObj => {
    const splited = dirStrs.map(e => e.split(sep));
    const root: DirObj = {};
    for(const [i, spDir] of splited.entries()) {
        let cur: DirObj = root;
        const t = spDir.length - 1;
        for(let j = 0; j < t; j++) {
            let child = cur[spDir[j]];
            if(child === undefined) {
                let flag = false;
                for(const key in cur) {
                    if(key.startsWith(spDir[j])) {
                        child = cur[key] = {};
                        flag = true;
                        break;
                    }
                }
                if(!flag) {
                    child = cur[spDir[j]] = {};
                }
            }
            if(typeof child === 'string') {
                child = cur[child] = {};
                delete cur[spDir[j]];
            }
            cur = child;
        }
        // spDir[t]的结构是'id@version'
        const [id, version] = spDir[t].split('@');
        if(id in cur) {
            cur[spDir[t]] = cur[id];
            delete cur[id];
        } else {
            const key = [id, version, suffices[i] || ''].join('$');
            cur[key] = key;
        }
    }
    return root;
}

// 在控制台打印一组包目录，一般输入的是detect的结果数组
export const printItemStrs = (itemStrs: (string | [string, string[]])[], depth: number = Infinity) => {
    const dfs = (cur: DirObj, d: number = 0, prefix = '') => {
        const keys = Object.keys(cur);
        const keylen = keys.length;
        for(const [i, key] of keys.entries()) {
            const child = cur[key];
            const pre = prefix + (i === keylen - 1 ? '└─' : '├─');
            const [id, version, link] = key.split('$', 3);
            const dir = (color: Chalk) => color(id) + ' ' + yellow(version ?? '') + ' ' + (link ?? '');
            if(typeof child === 'string') {
                console.log(pre + '─ ' + dir(green));
                continue;
            }
            console.log(pre + (d < depth ? '┬ ': '─ ') + dir(cyan));
            if(d < depth) {
                dfs(child, d + 1, prefix + (i === keylen - 1 ? '  ' : '│ '));
            }
        }
    }
    
    const ver = (e: string) => toDepItemWithId(e).version;
    // 将(string | [string, string[]])[]映射为[string, string][]格式
    // 第一个string为目录，第二个string为链接指向的原目录，如果不是链接则为空串
    const linkMap: [string, string][] = 
        itemStrs.map((e, i) => 
            typeof e === 'string' ? 
                [[e, ''] as [string, string]] :
                e[1].map<[string, string]>(d => [d + '@' + ver(e[0]), e[0].startsWith(d) ? '' : e[0]])
        ).flat();
    dfs(dirsToObj(linkMap.map(e => e[0]), linkMap.map(e => e[1] ? '-> ' + gray(e[1]) : '')));
}

export function evaluate(
    depEval: DepEval,
    pkgList: string[],
    outputs?: any
): string[] {
    const notAnalyzed: string[] = [];
    if(!outputs) outputs = {};
    const {
        depth, analyzed: hash, 
        notFound, rangeInvalid, 
        optionalNotMeet, 
        scope: { norm, dev, peer }
    } = depEval;

    // 检查哈希表集合hash中的记录与detect结果的相差
    if (pkgList) {
        const notInHash = pkgList.filter(e => !hash.has(e)).sort();
        const notInList = [...hash].filter(e => !pkgList.includes(e)).sort();
        if (notInHash.length) {
            // 如果有元素存在于detect结果却不存在于哈希集合中
            // 说明这些元素没有被通过依赖搜索覆盖到，如果scope不是全部或者递归深度有限，这是正常现象
            if (depth < Infinity || !norm || !dev || !peer) {
                const coverage = ((1 - notInHash.length / pkgList.length) * 100).toFixed(2);
                console.log(desc.coverage
                    .replace('%d', yellowBright(depth))
                    .replace('%cv', yellowBright(coverage + '%'))
                    .replace('%len', yellow(notInHash.length))
                );
            } else {
                // 如果搜索深度为Infinity，有可能因为它们并不被任何包依赖
                console.warn(orange(desc.notInHash));
                notInHash.slice(0, 8).forEach(e => console.log('-', green(e)));
                if(notInHash.length >= 8) {
                    console.warn("  ..." + desc.extra.replace("%len", yellow(notInHash.length)));
                }
                console.warn(orange(desc.notInHash2));
            }
            notAnalyzed.push(...notInHash);
        }
        if (notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn(orange(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.slice(0, 8).forEach(e => console.log('-', green(e)));
            if(notInList.length >= 8) {
                console.warn("  ..." + desc.extra.replace("%len", yellow(notInList.length)));
            }
        }
        outputs['unused'] = notInHash;
        outputs['notDetected'] = notInList;
    }
    const tStr = (type: DependencyType) => type !== "norm" ? type + " " : "";
    const nStr = (e: NotFoundItem) => 
        `${e.id} ${e.range} ${tStr(e.type)}REQUIRED BY ${e.by}`;
    const iStr = (e: InvalidItem) => 
        `${e.id} ${tStr(e.type)}REQUIRE ${e.range} BUT ${e.version} BY ${e.by}`;

    if (optionalNotMeet.length) {
        console.log(desc.optNotMeet.replace("%d", yellow(optionalNotMeet.length)));
    }
    if (rangeInvalid.length) {
        console.warn(orange(desc.rangeInvalid
            .replace("%d", yellowBright(rangeInvalid.length))
            .replace(/%1(.*)%1/, bgMagenta("$1"))
        ));
        rangeInvalid.forEach(e => console.warn('-', green(iStr(e))));
    }
    if (notFound.length) {
        console.warn(orange(desc.pkgNotFound
            .replace("%d", yellowBright(notFound.length))
            .replace(/%1(.*)%1/, bgMagenta("$1"))
        ));
        notFound.forEach(e => console.warn('-', green(nStr(e))));
        console.warn(orange(desc.pkgNotFound2));
    }

    return notAnalyzed;
}

