import { join, relative, sep } from "path";
import { readPackageJson } from ".";
import analyze, { PACKAGE_JSON, analyzePackage } from "./analyze";
import { DepEval, DepItem } from "./types";
import { QueueItem, getParentPath } from "./recurUtils";
import fs from "fs";

// pnpm包管理器分析广度优先搜索实现
export default function (
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
    let pkgPath = join(pth, id);
    
    if(!fs.existsSync(abs(pkgPath))) {
        // 链接无效，则包未找到
        const type = p.type === 'norm' ? '' : p.type;
        (p.optional ? optionalNotMeet : notFound)
            .push(`${id} ${range} ${type} REQUIRED BY ${by}`);
        p.target[id] = {
            version: "NOT_FOUND", path: null, 
            meta: { 
                range, type: p.type,  depthEnd: p.depth > depth,
                optional: p.optional, invalid: false
            }
        };
        return;
    }

    // 如果路径为符号链接，则将路径转到源文件
    if(fs.lstatSync(abs(pkgPath)).isSymbolicLink()) {
        const org = fs.readlinkSync(abs(pkgPath));
        // readlink在windows和linux里表现不一样，所以这里要做区分
        if(sep === '/') { // linux下realink获取的符号链接地址是文件的相对位置
            pkgPath = join(pth, id, "..", org);
        } else { // windows下realink获取的符号链接地址是绝对位置
            pkgPath = relative(abs(), org);
        }
        pth = getParentPath(id, pkgPath);
    }

    analyzePackage(abs, depth, pth, pth, p, queue, depEval);
}