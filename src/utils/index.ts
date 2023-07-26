export const readPackageJson = (fileUri: string): any => {
    return require(fileUri);
}

export const countMatches = (str: string, matcher: RegExp | string): number => 
    str.match(new RegExp(matcher, "g"))?.length ?? 0;

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