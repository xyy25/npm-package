function getLength(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function limit(val, min = 0, max = Infinity) {
    return Math.max(Math.min(val, max), min);
}

// 计算两点的中心点(用于确认摆放在连接线上的文字的位置)
function getCenter(x1, y1, x2, y2) {
    return { 
        x: (x1 + x2) / 2, 
        y: (y1 + y2) / 2
    }
}

// 计算两点角度
function getAngle(x1, y1, x2, y2) {
    var x = Math.abs(x1 - x2);
    var y = Math.abs(y1 - y2);
    var z = Math.sqrt(x * x + y * y);
    return Math.round((-Math.acos(y / z) / Math.PI * 180));
}

// 求无权有向图某个起始顶点到所有其他顶点的最短路径，如果无法通达，则路径为null
// @return (number[] | null)[]
function getPaths(startIndex, nodes, getAdjacent, filter = () => true, getId = i => i) {
    const dists = new Array(nodes.length).fill(Infinity);
    const paths = new Array(nodes.length).fill(null);
    const queue = [];
    const stNode = nodes[getId(startIndex)];
 
    queue.push({ i: startIndex, v: stNode, p: [startIndex], d: 0 });
    while(queue.length) {
        const { i, v, p, d } = queue.shift();
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