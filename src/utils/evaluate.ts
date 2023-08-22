import chalk from "chalk";
import ProgressBar from "progress";
import { DependencyType, DepEval, DepResult, InvalidItem, NotFoundItem } from "./types";
import analyze, { orange } from './analyze';
import { logs } from '../lang/zh-CN.json'
import path from "path";
import { toDepItemWithId } from ".";

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
        public dir: string,
        public target: DepResult
    ) {}
};

export const createBar = (total: number): ProgressBar | null => {
    const outLength = process.stdout.columns;
    return new ProgressBar(
            `:eff Q${green(':queue')} ${yellowBright(':current')}/${yellow(':total')}` +
            ` [:bar] ` + (outLength >= 100 ? ':nowComplete' : ''), {
                total: total,
                head: chalk.red('▇'),
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
        pkgRoot, manager,
        depth, analyzed: hash, 
        notFound, rangeInvalid, 
        optionalNotMeet, 
        scope: { norm, dev, peer }
    } = depEval;
    console.log(cyan('\n' + logs['utils/analyze.ts'].analyzed.replace("%d", yellowBright(depEval.analyzed.size))));
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
                notRequired.push(...notInHash);
            } else {
                // 如果搜索深度为Infinity，有可能因为它们并不被任何包依赖
                console.warn(orange(desc.notInHash.replace("%len", yellow(notInHash.length))));
                notInHash.forEach(e => console.log('-', green(e)));
                console.warn(orange(desc.notInHash2));
                notRequired.push(...notInHash);

                // 弹出询问是否需要检测这些包的依赖关系
                {
                    notRequired.splice(0);
                    for(const itemStr of notInHash) {
                        const { id, dir } = toDepItemWithId(itemStr);
                        const relDir = path.join(dir!, id);
                        // console.log(relDir);
                        analyze(pkgRoot, manager, depth, true, false, false, pkgList.length, relDir, {
                            result: depEval.result, analyzed: hash
                        });
                    }
                    console.log(cyan('\n' + logs['utils/analyze.ts'].analyzed.replace("%d", yellowBright(depEval.analyzed.size))));
                    const stillNotInhash = pkgList.filter(e => !hash.has(e)).sort();
                    console.warn(orange(desc.notInHash.replace("%len", yellow(stillNotInhash.length))));
                    stillNotInhash.forEach(e => console.log('-', green(e)));
                }
            }
        }
        if (notInList.length) {
            // 如果有元素存在于哈希集合却不存在于detect结果中
            // 说明这些元素可能是detect搜索方法的漏网之鱼，可能是detect的深度过低
            console.warn(orange(desc.notInList.replace("%len", yellow(notInList.length))));
            notInList.forEach(e => console.log('-', green(e)));
        }
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

    return notRequired;
}
