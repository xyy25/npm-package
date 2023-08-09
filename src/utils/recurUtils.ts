import chalk from "chalk";
import ProgressBar from "progress";
import { DependencyType, DepEval, DepResult } from "./types";
import { orange } from './analyze';
import { logs } from '../lang/zh-CN.json'
import path from "path";

const { 'utils/recurUtils.ts': desc } = logs;
const { green, cyan, yellow, yellowBright, bgMagenta, black } = chalk;

export class QueueItem {
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

export const getParentPath = (id: string, pkgPath: string): string =>
    path.join(pkgPath, ...id.split("/").map(() => ".."));

export const createBar = (total: number): ProgressBar | null => {
    const outLength = process.stdout.columns;
    return new ProgressBar(
            `Q${green(':queue')} ${yellowBright(':current')}/${yellow(':total')}` +
            ` [:bar] ` + (outLength >= 100 ? ':nowComplete' : ''), {
                total: total,
                complete: yellowBright('▇'),
                incomplete: black(' ')
        }); 
}

export function evaluate(
    depEval: DepEval,
    pkgList: string[]
): string[] {
    const notRequired: string[] = [];
    const {
        depth, analyzed: hash, notFound, rangeInvalid, optionalNotMeet, scope: { norm, dev, peer }
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
                console.warn(orange(desc.notInHash.replace("%len", yellow(notInHash.length))));
                notInHash.forEach(e => console.log('-', green(e)));
                console.warn(orange(desc.notInHash2));
            }
            notRequired.push(...notInHash);
        }
        if (notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn(orange(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.forEach(e => console.log('-', green(e)));
        }
    }
    if (optionalNotMeet.length) {
        console.log(desc.optNotMeet.replace("%d", yellow(optionalNotMeet.length)));
    }
    if (rangeInvalid.length) {
        console.warn(orange(desc.rangeInvalid
            .replace("%d", yellowBright(rangeInvalid.length))
            .replace("%rangeInvalid2", bgMagenta(desc.rangeInvalid2))
        ));
        rangeInvalid.forEach(e => console.warn('-', green(e)));
    }
    if (notFound.length) {
        console.warn(orange(desc.pkgNotFound
            .replace("%d", yellowBright(notFound.length))
            .replace("%pkgNotFound2", bgMagenta(desc.pkgNotFound2))
        ));
        notFound.forEach(e => console.warn('-', green(e)));
        console.warn(orange(desc.pkgNotFound3));
    }

    return notRequired;
}
