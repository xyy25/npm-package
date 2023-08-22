import { join, relative, sep } from "path";
import { analyzePackage } from "./analyze";
import { DepEval } from "./types";
import { QueueItem } from "./evaluate";
import { getParentDir } from ".";

import fs from "fs";

// pnpm包管理器分析广度优先搜索实现
export default function (
    abs: (...dir: string[]) => string,
    depth: number,
    queue: QueueItem[],
    depEval: DepEval
) {
    const { notFound, optionalNotMeet } = depEval;

    const p = queue.shift();
    if (!p) return;
    const { id, range, by } = p;

    let curDir = p.dir;
    let pkgDir = join(curDir, id);
    
    if(!fs.existsSync(abs(pkgDir))) {
        // 链接无效，则包未找到
        (p.optional ? optionalNotMeet : notFound)
            .push({ id, type: p.type, range, by });
        p.target[id] = {
            version: "NOT_FOUND", dir: null, 
            meta: { 
                range, type: p.type,  depthEnd: p.depth > depth,
                optional: p.optional, invalid: false
            }
        };
        return;
    }

    // 如果路径为符号链接，则将路径转到源文件
    if(fs.lstatSync(abs(pkgDir)).isSymbolicLink()) {
        const org = fs.readlinkSync(abs(pkgDir));
        // readlink在windows和linux里表现不一样，所以这里要做区分
        if(sep === '/') { // linux下realink获取的符号链接地址是文件的相对位置
            pkgDir = join(curDir, id, "..", org);
        } else { // windows下realink获取的符号链接地址是绝对位置
            pkgDir = relative(abs(), org);
        }
        curDir = getParentDir(id, pkgDir);
    }

    analyzePackage(abs, depth, curDir, curDir, p, queue, depEval);
}