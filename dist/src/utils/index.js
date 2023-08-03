"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringPlus = exports.compareVersionExpr = exports.compareVersion = exports.limit = exports.toDiagram = exports.find = exports.toString = exports.countMatches = exports.readPackageJson = void 0;
const path_1 = require("path");
const readPackageJson = (fileUri) => {
    return require(fileUri);
};
exports.readPackageJson = readPackageJson;
const countMatches = (str, matcher) => { var _a, _b; return (_b = (_a = str.match(new RegExp(matcher, "g"))) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0; };
exports.countMatches = countMatches;
const toString = (depItem, id) => {
    if ((id = id !== null && id !== void 0 ? id : depItem.id) === undefined)
        return '';
    return (0, path_1.join)(depItem.path, id + '@' + depItem.version);
};
exports.toString = toString;
const find = (items, item) => items.findIndex(e => (0, exports.toString)(e) === (0, exports.toString)(item));
exports.find = find;
const toDiagram = (depResult, rootPkg) => {
    var _a, _b;
    const res = [{
            id: (_a = rootPkg === null || rootPkg === void 0 ? void 0 : rootPkg.name) !== null && _a !== void 0 ? _a : 'root',
            version: (_b = rootPkg === null || rootPkg === void 0 ? void 0 : rootPkg.version) !== null && _b !== void 0 ? _b : 'root',
            path: path_1.sep,
            requiring: [],
            requiredBy: []
        }];
    const dfs = (dep, originIndex = 0) => {
        for (const [id, item] of Object.entries(dep)) {
            const { requires, range } = item, rest = __rest(item, ["requires", "range"]);
            const newItem = Object.assign(Object.assign({ id }, rest), { requiring: [], requiredBy: [originIndex] });
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
            if (requires) {
                dfs(requires, index);
            }
        }
    };
    dfs(depResult);
    return res;
};
exports.toDiagram = toDiagram;
const limit = (str, length) => str.slice(0, Math.min(str.length, Math.floor(length)) - 3) + '...';
exports.limit = limit;
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
