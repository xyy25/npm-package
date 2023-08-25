import { DiagramNode, DirectedDiagram, PackageJson, PackageManager } from './types';
import { join, sep } from 'path';
import fs from 'fs';

// 获取包根目录下的package.json对象
export const readPackageJson = (fileUri: string): PackageJson | null => {
    try { return require(fileUri); } catch(e: any) { return null; }
}

// 根据lock文件判定该项目使用的是哪种包管理器
export function getManagerType(pkgRoot: string): PackageManager {
    let manager: PackageManager = 'npm';
    fs.existsSync(join(pkgRoot, 'yarn.lock')) && (manager = 'yarn');
    fs.existsSync(join(pkgRoot, 'pnpm-lock.yaml')) && (manager = 'pnpm');
    return manager;
}

// 获取包根目录下的README.md文件
export const getREADME = (id: string, dir?: string): string | null => {
    try {
        const files = ['README.md', 'Readme.md', 'readme.md'];
        const exists = files.filter(e => 
            fs.existsSync(join(dir ?? '', id, e)) &&
            fs.lstatSync(join(dir ?? '', id, e)).isFile()
        );
        
        return exists.length ? fs.readFileSync(exists[0]).toString() : null; 
    } catch(e: any) {
        return null; 
    }
}

export function getParentDir(id: string, pkgDir: string): string;
export function getParentDir([space, name]: [string, string], pkgDir: string): string;
export function getParentDir(par1: string | [string, string], pkgDir: string): string { 
    return typeof par1 === 'string' ?
        join(pkgDir, ...par1.split("/").map(() => "..")) :
        join(pkgDir, par1[0] && "..", par1[1] && "..");
}

export const countMatches = (str: string, matcher: RegExp | string): number => 
    str.match(new RegExp(matcher, "g"))?.length ?? 0;

type Item = { id?: string, version: string, dir: string | null };

export const toString = <T extends Item>(depItem: T, id?: string): string => {
    if((id = id ?? depItem.id) === undefined) return '';
    return join(depItem.dir ?? '', id + '@' + depItem.version);
}

export const limit = (str: string, length: number): string => 
    str.slice(0, Math.min(str.length, Math.floor(length)) - 3) + '...';

export const splitAt = (str: string, pos: number): [string, string] =>
    pos < 0 ? ['', str] : pos >= str.length ? [str, ''] : 
        [str.slice(0, pos), str.slice(pos)];
    
export const find = <T extends Item>(items: DiagramNode[], item: T): number =>
    items.findIndex(e => toString(e) === toString(item));

export const getSpaceName = (id: string): [string, string] => 
    id.includes('/') ? id.split('/', 2) as [string, string] : ['', id];

export const toDepItemWithId = (itemStr: string): DiagramNode => {
    const splitDirId = (itemUri: string, version: string, pos: number): DiagramNode => {
        const [dir, id] = splitAt(itemUri, pos);
        const [space, name] = getSpaceName(id.slice(1));
        return { 
            id: id.slice(1), space, name, version, dir, 
            meta: [], requiring: [], requiredBy: [] 
        }
    }
    const atPos = itemStr.lastIndexOf('@');
    const [pre, post] = splitAt(itemStr, atPos);
    let sepAfterAt = post.match(/\/|\\/g)?.length ?? 0;
    if(sepAfterAt) { // 应对没有@版本的异常状态（虽然几乎用不到）
        if(sepAfterAt > 1) {
            const lastSep = atPos + post.lastIndexOf(sep);
            return splitDirId(itemStr, '', lastSep);
        }
        return splitDirId(itemStr, '', atPos - 1);
    }
    const areaAtPos = pre.lastIndexOf('@');
    if(areaAtPos < 0) {
        return splitDirId(pre, post.slice(1), pre.lastIndexOf(sep));
    }
    const [preArea, postArea] = splitAt(pre, areaAtPos);
    sepAfterAt = postArea.match(/\/|\\/g)?.length ?? 0;
    if(sepAfterAt > 1) {
        return splitDirId(pre, post.slice(1), pre.lastIndexOf(sep));
    }
    return splitDirId(pre, post.slice(1), areaAtPos - 1);
}

export const timeString = (miliseconds: number): string => {
    let str: string, t = miliseconds;
    str = (t % 1e3) + 'ms';
    t = Math.floor(t / 1e3);
    if(!t) return str;
    str = `${t % 60}.${miliseconds % 1000}s`;
    t = Math.floor(t / 60);
    if(!t) return str;
    str = `${t % 60}m${str}`;
    t = Math.floor(t / 60);
    if(!t) return str;
    str = `${t % 24}h${str}`;
    t = Math.floor(t / 24);
    if(!t) return str;
    str = `${t}d${str}`;
    return str;
}

export const compareVersion = (versionA: string, versionB: string): -1 | 0 | 1 => {
    const [arr1, arr2] = [versionA, versionB].map(v => v.split('.'));
    const [len1, len2] = [arr1.length, arr2.length];
    const minlen = Math.min(len1, len2);
    let i = 0
    for (i; i < minlen; i++) {
        const [a, b] = [arr1[i], arr2[i]].map(e => parseInt(e));
        if (a > b) {
            return 1
        } else if (a < b) {
            return -1
        }
    }
    if (len1 > len2) {
        for (let j = i; j < len1; j++) {
            if (parseInt(arr1[j]) != 0) {
                return 1
            }
        }
        return 0
    } else if (len1 < len2) {
        for (let j = i; j < len2; j++) {
            if (parseInt(arr2[j]) != 0) {
                return -1
            }
        }
        return 0
    }
    return 0
}

type CompareSymbol = "<" | ">" | "==" | "!=" | "<=" | ">=";
export const compareVersionExpr = (input: string, expr: CompareSymbol, target: string): boolean => {
    const res = compareVersion(input, target);
    switch(expr) {
        case "<": return res === -1;
        case ">": return res === 1;
        case "==": return res === 0;
        case "!=": return res !== 0;
        case "<=": return res <= 0;
        case ">=": return res >= 0;
    }
}

export const stringPlus = (augend: string | number, addend: string | number): string => {
    return String(
        (typeof augend === 'string' ? parseInt(augend) : augend)
        +
        (typeof addend === 'string' ? parseInt(addend) : addend)
    );
}