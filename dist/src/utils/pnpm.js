"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const analyze_1 = require("./analyze");
const _1 = require(".");
const fs_1 = __importDefault(require("fs"));
// pnpm包管理器分析广度优先搜索实现
function default_1(abs, depth, queue, depEval) {
    const { notFound, optionalNotMeet } = depEval;
    const p = queue.shift();
    if (!p)
        return;
    const { id, range, by } = p;
    let curDir = p.dir;
    let pkgDir = (0, path_1.join)(curDir, id);
    if (!fs_1.default.existsSync(abs(pkgDir))) {
        // 链接无效，则包未找到
        (p.optional ? optionalNotMeet : notFound)
            .push({ id, type: p.type, range, by });
        p.target[id] = {
            version: "NOT_FOUND", dir: null,
            meta: {
                range, type: p.type, depthEnd: p.depth > depth,
                optional: p.optional, invalid: false
            }
        };
        return;
    }
    // 如果路径为符号链接，则将路径转到源文件
    if (fs_1.default.lstatSync(abs(pkgDir)).isSymbolicLink()) {
        const org = fs_1.default.readlinkSync(abs(pkgDir));
        // readlink在windows和linux里表现不一样，所以这里要做区分
        if (path_1.sep === '/') { // linux下realink获取的符号链接地址是文件的相对位置
            pkgDir = (0, path_1.join)(curDir, id, "..", org);
        }
        else { // windows下realink获取的符号链接地址是绝对位置
            pkgDir = (0, path_1.relative)(abs(), org);
        }
        curDir = (0, _1.getParentDir)(id, pkgDir);
    }
    (0, analyze_1.analyzePackage)(abs, depth, curDir, curDir, p, queue, depEval);
}
exports.default = default_1;
