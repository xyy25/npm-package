"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringPlus = exports.compareVersionExpr = exports.compareVersion = exports.toDepItemWithId = exports.toDiagram = exports.find = exports.splitAt = exports.limit = exports.toString = exports.countMatches = exports.getREADME = exports.readPackageJson = void 0;
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
// 获取包根目录下的package.json对象
const readPackageJson = (fileUri) => {
    try {
        return require(fileUri);
    }
    catch (e) {
        return null;
    }
};
exports.readPackageJson = readPackageJson;
// 获取包根目录下的README.md文件
const getREADME = (id, path) => {
    try {
        const files = ['README.md', 'Readme.md', 'readme.md'];
        const exists = files.filter(e => fs_1.default.existsSync((0, path_1.join)(path !== null && path !== void 0 ? path : '', id, e)) &&
            fs_1.default.lstatSync((0, path_1.join)(path !== null && path !== void 0 ? path : '', id, e)).isFile());
        return exists.length ? fs_1.default.readFileSync(exists[0]).toString() : null;
    }
    catch (e) {
        return null;
    }
};
exports.getREADME = getREADME;
const countMatches = (str, matcher) => { var _a, _b; return (_b = (_a = str.match(new RegExp(matcher, "g"))) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0; };
exports.countMatches = countMatches;
const toString = (depItem, id) => {
    if ((id = id !== null && id !== void 0 ? id : depItem.id) === undefined)
        return '';
    return (0, path_1.join)(depItem.path, id + '@' + depItem.version);
};
exports.toString = toString;
const limit = (str, length) => str.slice(0, Math.min(str.length, Math.floor(length)) - 3) + '...';
exports.limit = limit;
const splitAt = (str, pos) => pos < 0 ? ['', str] : pos >= str.length ? [str, ''] :
    [str.slice(0, pos), str.slice(pos)];
exports.splitAt = splitAt;
const find = (items, item) => items.findIndex(e => (0, exports.toString)(e) === (0, exports.toString)(item));
exports.find = find;
const toDiagram = (depResult, rootPkg) => {
    var _a, _b;
    const res = [{
            id: (_a = rootPkg === null || rootPkg === void 0 ? void 0 : rootPkg.name) !== null && _a !== void 0 ? _a : 'root',
            version: (_b = rootPkg === null || rootPkg === void 0 ? void 0 : rootPkg.version) !== null && _b !== void 0 ? _b : 'root',
            path: path_1.sep,
            meta: [],
            requiring: [],
            requiredBy: []
        }];
    const dfs = (dep, originIndex = 0) => {
        for (const [id, item] of Object.entries(dep)) {
            const { requires, version, path, type, optional, range } = item;
            const newItem = {
                id, version, path,
                meta: [], requiring: [],
                requiredBy: [originIndex]
            };
            // 在纪录中查找该顶点
            let index = (0, exports.find)(res, newItem);
            if (index === -1) {
                // 如果顶点不存在，则插入新顶点
                index = res.push(newItem) - 1;
            }
            else {
                // 如果顶点已存在，则在结点的被依赖（入边）属性中登记起始顶点
                res[index].requiredBy.push(originIndex);
            }
            // 起始顶点的依赖（出边）属性中登记该顶点
            res[originIndex].requiring.push(index);
            res[originIndex].meta.push({
                range, type, optional
            });
            if (requires) {
                dfs(requires, index);
            }
        }
    };
    dfs(depResult);
    return res;
};
exports.toDiagram = toDiagram;
const toDepItemWithId = (itemStr) => {
    var _a, _b, _c, _d;
    const splitPathId = (itemUri, version, pos) => {
        const [path, id] = (0, exports.splitAt)(itemUri, pos);
        return {
            id: id.slice(1), version, path,
            meta: [], requiring: [], requiredBy: []
        };
    };
    const atPos = itemStr.lastIndexOf('@');
    const [pre, post] = (0, exports.splitAt)(itemStr, atPos);
    let sepAfterAt = (_b = (_a = post.match(/\/|\\/g)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    if (sepAfterAt) { // 应对没有@版本的异常状态（虽然几乎用不到）
        if (sepAfterAt > 1) {
            const lastSep = atPos + post.lastIndexOf(path_1.sep);
            return splitPathId(itemStr, '', lastSep);
        }
        return splitPathId(itemStr, '', atPos - 1);
    }
    const areaAtPos = pre.lastIndexOf('@');
    if (areaAtPos < 0) {
        return splitPathId(pre, post.slice(1), pre.lastIndexOf(path_1.sep));
    }
    const [preArea, postArea] = (0, exports.splitAt)(pre, areaAtPos);
    sepAfterAt = (_d = (_c = postArea.match(/\/|\\/g)) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0;
    if (sepAfterAt > 1) {
        return splitPathId(pre, post.slice(1), pre.lastIndexOf(path_1.sep));
    }
    return splitPathId(pre, post.slice(1), areaAtPos - 1);
};
exports.toDepItemWithId = toDepItemWithId;
const compareVersion = (versionA, versionB) => {
    const [arr1, arr2] = [versionA, versionB].map(v => v.split('.'));
    const [len1, len2] = [arr1.length, arr2.length];
    const minlen = Math.min(len1, len2);
    let i = 0;
    for (i; i < minlen; i++) {
        const [a, b] = [arr1[i], arr2[i]].map(e => parseInt(e));
        if (a > b) {
            return 1;
        }
        else if (a < b) {
            return -1;
        }
    }
    if (len1 > len2) {
        for (let j = i; j < len1; j++) {
            if (parseInt(arr1[j]) != 0) {
                return 1;
            }
        }
        return 0;
    }
    else if (len1 < len2) {
        for (let j = i; j < len2; j++) {
            if (parseInt(arr2[j]) != 0) {
                return -1;
            }
        }
        return 0;
    }
    return 0;
};
exports.compareVersion = compareVersion;
const compareVersionExpr = (input, expr, target) => {
    const res = (0, exports.compareVersion)(input, target);
    switch (expr) {
        case "<": return res === -1;
        case ">": return res === 1;
        case "==": return res === 0;
        case "!=": return res !== 0;
        case "<=": return res <= 0;
        case ">=": return res >= 0;
    }
};
exports.compareVersionExpr = compareVersionExpr;
const stringPlus = (augend, addend) => {
    return String((typeof augend === 'string' ? parseInt(augend) : augend)
        +
            (typeof addend === 'string' ? parseInt(addend) : addend));
};
exports.stringPlus = stringPlus;
