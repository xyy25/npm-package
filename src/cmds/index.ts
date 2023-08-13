import { basename, dirname, join, normalize, resolve } from "path";
import { existsSync, lstatSync, readdirSync } from "fs";

export const outJsonRelUri = (relUri: string) => {
    let baseName = resbase(relUri);
    let dirName = dirname(relUri);
    if(!baseName.endsWith('.json')) baseName += '.json';
    return join(dirName, baseName);
}

export const resbase = (relUri: string) => basename(resolve(relUri));

export const getDirs = (ans: any, input: string) => 
    getFiles(ans, input, 1, (file) => lstatSync(file).isDirectory());

// 给inquirer递归获取文件列表的autocomplete脚本
export const getFiles = (
    ans: any, 
    input: string, 
    maxDepth: number,
    filter: (file: string) => boolean
) => {
    input ??= '.';
    const inputAbs = resolve(input);
    const getChilds = (
        depth: number, 
        root: string, 
        chfilter: typeof filter
    ): string[] => {
        const res: string[] = [];
        const rootAbs = resolve(root);
        const files = readdirSync(rootAbs) ?? [];
        res.push(
            ...files.filter(e => chfilter(join(rootAbs, e)))
                .map(e => normalize(join(root, e)))
        );
        if(depth < maxDepth) {
            const dirs = files.filter(
                e => lstatSync(join(rootAbs, e)).isDirectory()
            );
            dirs.forEach(e => res.push(
                ...getChilds(depth + 1, join(root, e), chfilter)
            ));
        }
        return res;
    } 
    try {
        if(!existsSync(inputAbs) || !lstatSync(inputAbs).isDirectory()) {
            const parent = dirname(input), parAbs = dirname(inputAbs);
            const base = basename(inputAbs);
            if(!existsSync(parAbs) || !lstatSync(parAbs).isDirectory()) {
                return [];
            }
            return getChilds(0, parent, 
                (file) => file.includes(base) && filter(file)
            );
        }
        return [input, ...getChilds(0, input, filter)].map(normalize);
    } catch {
        return [];
    }
}