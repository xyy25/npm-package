import { Node } from './chart'

export type PosTuple = [number, number];

export function getLength([x1, y1]: PosTuple, [x2, y2]: PosTuple): number;

export function limit(val: number, min: number = 0, max: number = Infinity): number;

// 判断字符串中是否含汉字
export function includeChinese(str: string): boolean;

// 计算两点的中心点(用于确认摆放在连接线上的文字的位置)
export function getCenter(
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number
): PosTuple;

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
    getAdjacent: (node: Node) => number[], 
    filter: (node: Node) => boolean = (node: Node) => true, 
    getId: (i: number) => number = (i: number) => i
): number[][];