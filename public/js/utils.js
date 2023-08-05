// 计算两点的中心点(用于确认摆放在连接线上的文字的位置)
function getCenter(x1, y1, x2, y2) {
    return [(x1 + x2) / 2, (y1 + y2) / 2]
}

// 计算两点角度
function getAngle(x1, y1, x2, y2) {
    var x = Math.abs(x1 - x2);
    var y = Math.abs(y1 - y2);
    var z = Math.sqrt(x * x + y * y);
    return Math.round((Math.asin(y / z) / Math.PI * 180));
}

// 求无权有向图某个起始顶点到所有其他顶点的最短路径
function getPaths(startIndex, nodes, getAdjacent) {
    const visited = new Array(nodes.length).fill(false);
    const paths = new Array(nodes.length).fill(null);
    const queue = [];
    const stNode = nodes[startIndex];
 
    queue.push({ i: startIndex, v: stNode, p: [startIndex] });
    while(queue.length) {
        const { i, v, p } = queue.shift();
        visited[i] = true;
        paths[i] = p;

        // 遍历相邻顶点
        for(const wi of getAdjacent(v)) {
            if(visited[wi]) continue;
            const w = nodes[wi];
            
            queue.push({ i: wi, v: w, p: [...p, wi] });
        }
    }

    return paths;
}