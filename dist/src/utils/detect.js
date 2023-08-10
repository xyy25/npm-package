"use strict";
// 递归扫描当前NODE_MODULES文件夹中依赖包的安装情况
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPnpm = void 0;
const path_1 = require("path");
const _1 = require(".");
const analyze_1 = require("./analyze");
const fs_1 = require("fs");
const _2 = require(".");
// 和analyze不同的地方在于：analyze是按照依赖的顺序分析，detect仅进行文件扫描
function detect(pkgRoot, manager, depth = Infinity) {
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    if (depth <= 0 ||
        !(0, fs_1.existsSync)(pkgRoot) ||
        !(0, fs_1.existsSync)(abs(analyze_1.NODE_MODULES))) {
        return [];
    }
    // 如果包管理器是pnpm的符号链接结构
    if (manager === 'pnpm') {
        return detectPnpm(pkgRoot).map(e => e[0]);
    }
    // 如果包管理器是npm或yarn的扁平结构
    const res = new Set();
    const countPkg = (modPath, pkgId) => {
        var _a, _b;
        const ver = (_b = (_a = (0, _1.readPackageJson)(abs(modPath, pkgId, analyze_1.PACKAGE_JSON))) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : '';
        const pkgStr = (0, _2.toString)({ version: ver, path: modPath }, pkgId);
        res.add(pkgStr);
        detect(abs(modPath, pkgId), manager, depth - 1)
            .forEach(e => res.add((0, path_1.join)(modPath, pkgId, e)));
    };
    for (const pkgId of (0, fs_1.readdirSync)(abs(analyze_1.NODE_MODULES))) {
        const modPath = analyze_1.NODE_MODULES;
        if (!(0, fs_1.lstatSync)(abs(modPath, pkgId)).isDirectory()
            || pkgId.startsWith('.')) {
            continue;
        }
        else if (pkgId.startsWith('@')) {
            const areaPath = (0, path_1.join)(modPath, pkgId);
            const areaPkgs = (0, fs_1.readdirSync)(abs(areaPath));
            for (const areaPkgId of areaPkgs) {
                if ((0, fs_1.lstatSync)(abs(areaPath, areaPkgId)).isDirectory())
                    countPkg(areaPath, areaPkgId);
            }
        }
        else {
            countPkg(modPath, pkgId);
        }
    }
    return [...res];
}
exports.default = detect;
const DOT_PNPM = '.pnpm';
function detectPnpm(pkgRoot) {
    const abs = (...path) => (0, path_1.join)(pkgRoot, ...path);
    const res = new Map();
    const countPkg = (modPath, pkgId) => {
        var _a, _b, _c, _d, _e;
        const pkgPath = (0, path_1.join)(modPath, pkgId);
        const lstat = (0, fs_1.lstatSync)(abs(pkgPath));
        // 如果目录是符号链接，则找它所指向的源目录，并放到一个组里
        if (lstat.isSymbolicLink()) {
            const org = (0, fs_1.readlinkSync)(abs(pkgPath));
            let orgPath;
            if (path_1.sep === '/') { // linux下，org是相对地址
                orgPath = (0, path_1.join)(modPath, pkgId, "..", org);
            }
            else { // windows下，org是绝对地址
                orgPath = (0, path_1.relative)(pkgRoot, org);
            }
            const ver = (_b = (_a = (0, _1.readPackageJson)(abs(orgPath, analyze_1.PACKAGE_JSON))) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : '';
            const orgStr = orgPath + (ver ? '@' + ver : '');
            if (!res.has(orgStr)) {
                res.set(orgStr, [pkgPath]);
            }
            else {
                (_c = res.get(orgStr)) === null || _c === void 0 ? void 0 : _c.push(pkgPath);
            }
        }
        else {
            const ver = (_e = (_d = (0, _1.readPackageJson)(abs(pkgPath, analyze_1.PACKAGE_JSON))) === null || _d === void 0 ? void 0 : _d.version) !== null && _e !== void 0 ? _e : '';
            const pkgStr = (0, _2.toString)({ version: ver, path: modPath }, pkgId);
            res.set(pkgStr, [pkgPath]);
        }
        detectPkg((0, path_1.join)(modPath, pkgId));
    };
    const readPkgs = (relPath) => {
        for (const name of (0, fs_1.readdirSync)(abs(relPath))) {
            if (name.startsWith('.') || (0, fs_1.lstatSync)(abs(relPath, name)).isFile()) {
                continue;
            }
            else if (name.startsWith('@')) {
                readPkgs((0, path_1.join)(relPath, name));
            }
            else {
                countPkg(relPath, name);
            }
        }
    };
    const detectPkg = (relRoot) => {
        const modPath = (0, path_1.join)(relRoot, analyze_1.NODE_MODULES);
        if ((0, fs_1.existsSync)(abs(modPath))) {
            readPkgs(modPath);
        }
        const pnpmPath = (0, path_1.join)(modPath, DOT_PNPM);
        if ((0, fs_1.existsSync)(abs(pnpmPath))) {
            for (const name of (0, fs_1.readdirSync)(abs(pnpmPath))) {
                detectPkg((0, path_1.join)(pnpmPath, name));
            }
        }
    };
    detectPkg('.');
    //console.log(res);
    return [...res];
}
exports.detectPnpm = detectPnpm;
