import { DepResult, DepItem, DepItemWithId, DirectedDiagram, PackageJson } from './types';
import { join, sep } from 'path';

export const readPackageJson = (fileUri: string): PackageJson => {
    return require(fileUri);
}

export const countMatches = (str: string, matcher: RegExp | string): number => 
    str.match(new RegExp(matcher, "g"))?.length ?? 0;

export const toString = (depItem: DepItemWithId | DepItem, id?: string): string => {
    if((id = id ?? (depItem as DepItemWithId).id) === undefined) return '';
    return join(depItem.path, id + '@' + depItem.version);
}
    
export const find = (items: DepItemWithId[], item: DepItemWithId): number =>
    items.findIndex(e => toString(e) === toString(item));
    
export const toDiagram = (depResult: DepResult, rootPkg?: any): DirectedDiagram => {
    const res: DirectedDiagram = {
        map: [{
          id: rootPkg?.name ?? 'root',
          version: rootPkg?.version ?? 'root',
          path: sep
        }], 
        borders: [[]]
    };
    
    const dfs = (dep: DepResult, parentIndex: number = 0) => {
        for(const [id, item] of Object.entries(dep)) {
            const { requires, range, ...rest } = item;
            const newItem = { id, ...rest };
            
            let index = find(res.map, newItem);
            if(index === -1) {
                index = res.map.push(newItem) - 1;
                res.borders.push([]);
            }
            res.borders[parentIndex].push(index);
                
            if(requires) {
                dfs(requires, index);
            }
        }
    }

    dfs(depResult);
    return res;
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