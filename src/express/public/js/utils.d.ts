import { Node } from './chart'

export type PosTuple = [number, number];

export function getLength([x1, y1]: PosTuple, [x2, y2]: PosTuple): number;

export function limit(val: number, min: number = 0, max: number = Infinity): number;

// 判断字符串中是否含汉字
export function includeChinese(str: string): boolean;

// 计算两点的中心点(用于确认摆放在连接线上的文字的位置)
export function getCenter([x1, y1]: PosTuple, [x2, y2]: PosTuple): PosTuple;

// 计算两点角度
export function getAngle(
    [x1, y1]: PosTuple, 
    [x2, y2]: PosTuple, 
    deg: boolean = false, 
    abs: boolean = false
): number;

// 求无权有向图某个起始顶点到所有其他顶点的最短路径，如果无法通达，则路径为null
export function getPaths(
    startIndex: number, 
    nodes: Node[], 
    getAdjacent: (i: number) => number[], 
    filter: (node: Node) => boolean = (node: Node) => true
): (number[] | null)[];

export function getDiagramGroups(
    nodes: Node[], 
    getAdjacent: (i: number) => number[],
    getRevAdjacent: (i: number) => number[]
): Node[][]

// 求强连通分量返回的数组元素结构
export type SCComponent = { 
    nodes: number[], // 该分量所含的顶点在有向图顶点数组中的下标
    inner: [number, number][], // 该分量的内部边，使用的是顶点在有向图顶点数组里的下标
    outer: { // 该分量的外部边，使用的是【每个分量在返回数组中的下标】
        ins?: number[], // 只有传参里传入了顶点入边的获取方法getRevAdjacent，才有此属性
        outs: number[]
    }
}

export function getScc(
    startIndex: number,
    nodes: Node[],
    getAdjacent: (i: number) => number[],
    getRevAdjacent?: (i: number) => number[]
): SCComponent[]

export function getCircuits(
    nodes: Node[],
    getAdjacent: (i: number) => number[]
): number[][]

export interface LinkNode<Datum> {
    data: Datum
    next: LinkNode<Datum> | null
}