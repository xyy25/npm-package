export type Dependencies = {
    [id: string]: string;
};

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
    gitHead?: string,
    xo?: {
        rules: {
            [name: string]: 'on' | 'off'
        }
    }
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
    requiring: number[],
    requiredBy: number[]
} & DepItem;


export type DirectedDiagram = 
    // 表示依赖关系的有向图结构
    DepItemWithId[];

/*
有向图的表示方法：
dia [     
        {
            id: 'pinus',
            version: '0.3.0',
            path: '\\node_modules',
            requiring: [1, 2],
            requiredBy: []
        }, { 
            id: 'axios', 
            version: '1.4.0', 
            path: '\\node_modules'
            requiring: [2],
            requiredBy: [0]
        }, {
            id: 'commander',
            version: '1.0.0',
            path: '\\node_modules'
            requiring: [],
            requiredBy: [0, 1]
        }
]
    // 数组dia下标为i的元素dia[i]含有表示出边的属性requiring，表示依赖关系
    // 如dia[i].requiring = [a, b, c]表示从dia[i]到dia[a], dia[b], dia[c]有一条有向边
    // 同时，dia[j]也额外增加了一条表示入边的属性requiredBy，表示被依赖关系
    // 如dia[a].requiredBy = [i, j, k]表示从dia[i], dia[j], dia[k]到dia[a]有一条有向边
*/
