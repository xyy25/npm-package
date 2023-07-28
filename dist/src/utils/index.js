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
exports.stringPlus = exports.compareVersionExpr = exports.compareVersion = exports.toDiagram = exports.find = exports.toString = exports.countMatches = exports.readPackageJson = void 0;
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
const toDiagram = (rootPkg, depResult) => {
    const res = {
        map: [{
                id: rootPkg.name,
                version: rootPkg.version,
                path: path_1.sep
            }],
        borders: [[]]
    };
    const dfs = (dep, parentIndex = 0) => {
        for (const [id, item] of Object.entries(dep)) {
            const { requires, range } = item, rest = __rest(item, ["requires", "range"]);
            const newItem = Object.assign({ id }, rest);
            let index = (0, exports.find)(res.map, newItem);
            if (index === -1) {
                index = res.map.push(newItem) - 1;
                res.borders.push([]);
            }
            res.borders[parentIndex].push(index);
            if (requires) {
                dfs(requires, index);
            }
        }
    };
    dfs(depResult);
    return res;
};
exports.toDiagram = toDiagram;
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
