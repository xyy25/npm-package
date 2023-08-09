// 递归扫描当前NODE_MODULES文件夹中依赖包的安装情况

import { join, relative, sep } from "path";
import { readPackageJson } from ".";
import { PackageManager } from "./types";
import { NODE_MODULES, PACKAGE_JSON } from "./analyze";
import { existsSync, readdirSync, lstatSync, readlinkSync } from "fs";
import { toString } from ".";

// 和analyze不同的地方在于：analyze是按照依赖的顺序分析，detect仅进行文件扫描
export default function detect(
    pkgRoot: string,
    manager: PackageManager,
    depth: number = Infinity
): string[]
{
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    if(
        depth <= 0 || 
        !existsSync(pkgRoot) || 
        !existsSync(abs(NODE_MODULES))
    ) { return []; }
    
    // 如果包管理器是pnpm的符号链接结构
    if(manager === 'pnpm') {
        return detectPnpm(pkgRoot).map(e => e[0]);
    }

    // 如果包管理器是npm或yarn的扁平结构
    const res: Set<string> = new Set();
    
    const countPkg = (modPath: string, pkgId: string) =>  {
        const ver = readPackageJson(abs(modPath, pkgId, PACKAGE_JSON))?.version ?? '';
        const pkgStr = toString({ version: ver, path: modPath }, pkgId);
        res.add(pkgStr);
        (detect(abs(modPath, pkgId), manager, depth - 1) as string[])
            .forEach(e => res.add(join(modPath, pkgId, e)));
    }

    for(const pkgId of readdirSync(abs(NODE_MODULES))) {
        const modPath = join(sep, NODE_MODULES)
        if(
            !lstatSync(abs(modPath, pkgId)).isDirectory()
            || pkgId.startsWith('.')
        ) {
            continue;
        } else if(pkgId.startsWith('@')) {
            const areaPath = join(modPath, pkgId);
            const areaPkgs = readdirSync(abs(areaPath));
            for(const areaPkgId of areaPkgs) {
                if(lstatSync(abs(areaPath, areaPkgId)).isDirectory())
                countPkg(areaPath, areaPkgId);
            }
        } else {
            countPkg(modPath, pkgId);
        }
    }
    return [...res];
}

const DOT_PNPM = '.pnpm';

export function detectPnpm(pkgRoot: string): [string, string[]][] {
    const abs = (...path: string[]): string => join(pkgRoot, ...path);
    const res = new Map<string, string[]>();

    const countPkg = (modPath: string, pkgId: string) => { // 登记一个依赖包
        const pkgPath = join(modPath, pkgId);
        const lstat = lstatSync(abs(pkgPath));
        // 如果目录是符号链接，则找它所指向的源目录，并放到一个组里
        if(lstat.isSymbolicLink()) { 
            const orgAbs = readlinkSync(abs(pkgPath));
            const orgPath = join(sep, relative(pkgRoot, orgAbs));
            const ver = readPackageJson(abs(orgPath, PACKAGE_JSON))?.version ?? '';
            const orgStr = orgPath + (ver ? '@' + ver : '');
            if(!res.has(orgStr)) {
                res.set(orgStr, [pkgPath]);
            } else {
                res.get(orgStr)?.push(pkgPath);
            }
        } else {
            const ver = readPackageJson(abs(pkgPath, PACKAGE_JSON))?.version ?? '';
            const pkgStr = toString({ version: ver, path: modPath }, pkgId);
            res.set(pkgStr, [pkgPath]);
        }
        detectPkg(join(modPath, pkgId));
    }

    const readPkgs = (relPath: string) => { // 读node_modules文件夹
        for(const name of readdirSync(abs(relPath))) {
            if(name.startsWith('.') || lstatSync(abs(relPath, name)).isFile()) {
                continue;
            } else if(name.startsWith('@')) {
                readPkgs(join(relPath, name));
            } else {
                countPkg(relPath, name);
            }
        }
    }

    const detectPkg = (relRoot: string) => { // 读内含node_modules文件夹的目录
        const modPath = join(relRoot, NODE_MODULES);
        if(existsSync(abs(modPath))) {
            readPkgs(modPath);
        }
    
        const pnpmPath = join(modPath, DOT_PNPM);
        if(existsSync(abs(pnpmPath))) {
            for(const name of readdirSync(abs(pnpmPath))) {
                detectPkg(join(pnpmPath, name));
            }
        }
    }

    detectPkg(sep);
    //console.log(res);

    return [...res];
}