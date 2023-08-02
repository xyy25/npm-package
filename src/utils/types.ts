export type Dependencies = {
    [id: string]: string;
};

export type DepResult = {
    [id: string]: DepItem;
};

export type DepItem = {
    version: string; // 该依赖包实际使用的版本（即在node_modules里存在的版本）
    range?: string; // 该依赖包需要的版本范围
    path: string; // 该依赖包安装的相对路径
    requires?: DepResult; // 该依赖包的子依赖列表（若无依赖或已经计算过，则没有这条）
};

export type DepItemWithId = {
    id: string;
} & DepItem;

export type PackageJson = {
    name: string,
    version: string,
    description: string,
    main: string,
    scripts: { [name: string]: string },
    keywords: string[],
    author: string,
    license: string | ({ type: string, url: string })[],
    dependencies?: Dependencies,
    devDependencies?: Dependencies,
    peerDependencies?: Dependencies,
    optionalDependencies?: Dependencies,
    peerDependenciesMeta?: {
        [id: string]: any
    }
    private?: boolean,
    homepage?: string,
    repository?: {
        type: string,
        url: string
    },
    engines?: {
        node: string
    },
    bugs?: {
        url: string
    },
    files?: string[],
    types?: string,
    bin?: { [name: string]: string },
    gitHead?: string
};

export type DirectedDiagram = {
    // 表示依赖关系的有向图结构
    map: DepItemWithId[]; // 下标映射
    borders: number[][]; // 有向图的边
};

/*
有向图的表示方法：
{
    map: [{ 
            id: 'axios', 
            version: '1.4.0', 
            path: '\\node_modules'
        }, {
            id: 'pinus',
            version: '0.3.0',
            path: '\\node_modules'
        }, {
            id: 'commander',
            version: '1.0.0',
            path: '\\node_modules'
        }],
    borders: [
        [2], 
        [0, 2],
        []
    ] 
    // borders中下标为i的数组[a, c]表示从map[i]到a, b, c有一条有向边
    // 即map[i]依赖map[a], map[b]和map[c]
}
*/
