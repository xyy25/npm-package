import { Node } from './chart'

export function getLength(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export function limit(val: number, min = 0, max = Infinity) {
    return Math.max(Math.min(val, max), min);
}

// 判断字符串中是否含汉字
export function includeChinese(str: string): boolean {
    return str.match(/[\u4E00-\u9FA5]/) !== null;
}

export type Pos = {
    x: number,
    y: number
};

export type PosTuple = [number, number];

// 计算两点的中心点(用于确认摆放在连接线上的文字的位置)
export function getCenter(x1: number, y1: number, x2: number, y2: number): Pos {
    return { 
        x: (x1 + x2) / 2, 
        y: (y1 + y2) / 2
    }
}

// 计算两点角度
export function getAngle([x1, y1]: PosTuple, [x2, y2]: PosTuple, deg = false, abs = false): number {
    var [dx, dy] = [x2 - x1, y2 - y1].map(e => (abs ? Math.abs(e) : e));
    let res = Math.atan2(dy, dx);
    deg && (res = res / Math.PI * 180);
    return res;
}

// 求无权有向图某个起始顶点到所有其他顶点的最短路径，如果无法通达，则路径为null
// @return (number[] | null)[]
export function getPaths(
    startIndex: number, 
    nodes: Node[], 
    getAdjacent: (node: Node) => number[], 
    filter = (node: Node) => true, 
    getId = (i: number) => i
): number[][] {
    const dists = new Array(nodes.length).fill(Infinity);
    const paths = new Array(nodes.length).fill(null);
    type QueueItem = { 
        i: number, v: Node, p: number[], d: number
    }
    const queue: QueueItem[] = [];
    const stNode = nodes[getId(startIndex)];
 
    queue.push({ i: startIndex, v: stNode, p: [startIndex], d: 0 });
    while(queue.length) {
        const { i, v, p, d } = queue.shift() as QueueItem;
        if(d >= dists[i]) continue;
        dists[i] = d;
        paths[i] = p;
        if(!filter(v)) continue; // 边过滤器，如果不符合要求则不考虑其相邻顶点

        // 遍历相邻顶点
        for(const wi of getAdjacent(v)) {
            const w = nodes[getId(wi)];
            if(!w) continue;

            queue.push({ i: wi, v: w, p: p.concat(wi), d: d + 1 });
        }
    }

    return paths;
}