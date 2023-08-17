export type PackageManager = 'npm' | 'yarn' | 'pnpm';
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

export type DependencyType = 'norm' | 'dev' | 'peer' | 'optional';

export type DepEval = {
    result: DepResult, // 分析结果
    scope: { // 分析范围是否包含主目录包所指定的：
        norm: boolean, // 普通依赖(dependencies、optionalDepdencies)
        dev: boolean, // 开发依赖(devDependencies)
        peer: boolean // 同级依赖(peerDependencies)
    },
    depth: number, // 分析递归深度
    analyzed: Set<string>, // 已分析的包列表
    notFound: string[], // 未找到且必需的依赖包列表
    rangeInvalid: string[], // 版本不合要求的包列表
    optionalNotMeet: string[] // 可选且未安装的包列表
}

export type DepResult = {
    [id: string]: DepItem;
};

export type DepItem = {
    version: string; // 【顶点属性】该依赖包实际使用的版本（即在node_modules里存在的版本）
    path: string | null; // 【顶点属性】该依赖包安装的相对路径
    requires?: DepResult; // 【顶点属性】该依赖包的子依赖列表（若无依赖或已经计算过，则没有这条）
    meta: LinkMeta;
};

// 顶点属性
export type DiagramNode = {
    id: string;
    version: string;
    path: string | null;
    meta: LinkMeta[];
    requiring: number[];
    requiredBy: number[];
};

// 边属性
export type LinkMeta = {
    type: DependencyType; // 【边属性】该依赖的类型
    range: string; // 【边属性】该依赖需要的版本范围
    optional: boolean; // 【边属性】该依赖是否必须
    invalid: boolean; // 【边属性】该依赖关系是否版本非法
    depthEnd: boolean; // 【边属性】该依赖关系是否到达了递归的终点（当递归深度有限时）
}

export type DirectedDiagram = 
    // 表示依赖关系的有向图结构
    DiagramNode[];

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
