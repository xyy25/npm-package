"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFiles = exports.getDirs = exports.resbase = exports.outJsonRelUri = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const outJsonRelUri = (relUri) => {
    let baseName = (0, exports.resbase)(relUri);
    let dirName = (0, path_1.dirname)(relUri);
    if (!baseName.endsWith('.json'))
        baseName += '.json';
    return (0, path_1.join)(dirName, baseName);
};
exports.outJsonRelUri = outJsonRelUri;
const resbase = (relUri) => (0, path_1.basename)((0, path_1.resolve)(relUri));
exports.resbase = resbase;
const getDirs = (ans, input) => (0, exports.getFiles)(ans, input, 1, (file) => (0, fs_1.lstatSync)(file).isDirectory());
exports.getDirs = getDirs;
// 给inquirer递归获取文件列表的autocomplete脚本
const getFiles = (ans, input, maxDepth, filter) => {
    input !== null && input !== void 0 ? input : (input = '.');
    const inputAbs = (0, path_1.resolve)(input);
    const getChilds = (depth, root, chfilter) => {
        var _a;
        const res = [];
        const rootAbs = (0, path_1.resolve)(root);
        const files = (_a = (0, fs_1.readdirSync)(rootAbs)) !== null && _a !== void 0 ? _a : [];
        res.push(...files.filter(e => chfilter((0, path_1.join)(rootAbs, e)))
            .map(e => (0, path_1.normalize)((0, path_1.join)(root, e))));
        if (depth < maxDepth) {
            const dirs = files.filter(e => (0, fs_1.lstatSync)((0, path_1.join)(rootAbs, e)).isDirectory());
            dirs.forEach(e => res.push(...getChilds(depth + 1, (0, path_1.join)(root, e), chfilter)));
        }
        return res;
    };
    try {
        if (!(0, fs_1.existsSync)(inputAbs) || !(0, fs_1.lstatSync)(inputAbs).isDirectory()) {
            const parent = (0, path_1.dirname)(input), parAbs = (0, path_1.dirname)(inputAbs);
            const base = (0, path_1.basename)(inputAbs);
            if (!(0, fs_1.existsSync)(parAbs) || !(0, fs_1.lstatSync)(parAbs).isDirectory()) {
                return [];
            }
            return getChilds(0, parent, (file) => file.includes(base) && filter(file));
        }
        return [input, ...getChilds(0, input, filter)].map(path_1.normalize);
    }
    catch (_a) {
        return [];
    }
};
exports.getFiles = getFiles;
