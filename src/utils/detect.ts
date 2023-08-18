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
    const abs = (...dir: string[]): string => join(pkgRoot, ...dir);
    if(
        depth < 0 || 
        !existsSync(pkgRoot) || 
        !existsSync(abs(NODE_MODULES))
    ) { return []; }
    
    // 如果包管理器是pnpm的符号链接结构
    if(manager === 'pnpm') {
        return detectPnpm(pkgRoot).map(e => e[0]);
    }

    // 如果包管理器是npm或yarn的扁平结构
    const res: Set<string> = new Set();
    
    const countPkg = (modDir: string, pkgId: string) =>  {
        const ver = readPackageJson(abs(modDir, pkgId, PACKAGE_JSON))?.version ?? '';
        const pkgStr = toString({ version: ver, dir: modDir }, pkgId);
        res.add(pkgStr);
        (detect(abs(modDir, pkgId), manager, depth - 1) as string[])
            .forEach(e => res.add(join(modDir, pkgId, e)));
    }

    for(const pkgId of readdirSync(abs(NODE_MODULES))) {
        const modDir = NODE_MODULES;
        if(
            !lstatSync(abs(modDir, pkgId)).isDirectory()
            || pkgId.startsWith('.')
        ) {
            continue;
        } else if(pkgId.startsWith('@')) {
            const areaDir = join(modDir, pkgId);
            const areaPkgs = readdirSync(abs(areaDir));
            for(const areaPkgId of areaPkgs) {
                if(lstatSync(abs(areaDir, areaPkgId)).isDirectory())
                countPkg(areaDir, areaPkgId);
            }
        } else {
            countPkg(modDir, pkgId);
        }
    }
    return [...res];
}

const DOT_PNPM = '.pnpm';

export function detectPnpm(pkgRoot: string): [string, string[]][] {
    const abs = (...dir: string[]): string => join(pkgRoot, ...dir);
    const res = new Map<string, string[]>();

    const countPkg = (modDir: string, pkgId: string) => { // 登记一个依赖包
        const pkgDir = join(modDir, pkgId);
        const lstat = lstatSync(abs(pkgDir));
        // 如果目录是符号链接，则找它所指向的源目录，并放到一个组里
        if(lstat.isSymbolicLink()) { 
            const org = readlinkSync(abs(pkgDir));
            let orgDir;
            if(sep === '/') { // linux下，org是相对地址
                orgDir = join(modDir, pkgId, "..", org);
            } else { // windows下，org是绝对地址
                orgDir = relative(pkgRoot, org);
            }
            const ver = readPackageJson(abs(orgDir, PACKAGE_JSON))?.version ?? '';
            const orgStr = orgDir + (ver ? '@' + ver : '');
            if(!res.has(orgStr)) {
                res.set(orgStr, [pkgDir]);
            } else {
                res.get(orgStr)?.push(pkgDir);
            }
        } else {
            const ver = readPackageJson(abs(pkgDir, PACKAGE_JSON))?.version ?? '';
            const pkgStr = toString({ version: ver, dir: modDir }, pkgId);
            res.set(pkgStr, [pkgDir]);
        }
        detectPkg(join(modDir, pkgId));
    }

    const readPkgs = (relDir: string) => { // 读node_modules文件夹
        for(const name of readdirSync(abs(relDir))) {
            if(name.startsWith('.') || lstatSync(abs(relDir, name)).isFile()) {
                continue;
            } else if(name.startsWith('@')) {
                readPkgs(join(relDir, name));
            } else {
                countPkg(relDir, name);
            }
        }
    }

    const detectPkg = (relRoot: string) => { // 读内含node_modules文件夹的目录
        const modDir = join(relRoot, NODE_MODULES);
        if(existsSync(abs(modDir))) {
            readPkgs(modDir);
        }
    
        const pnpmDir = join(modDir, DOT_PNPM);
        if(existsSync(abs(pnpmDir))) {
            for(const name of readdirSync(abs(pnpmDir))) {
                detectPkg(join(pnpmDir, name));
            }
        }
    }

    detectPkg('.');
    //console.log(res);

    return [...res];
}