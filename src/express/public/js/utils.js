export function getLength([x1, y1], [x2, y2]) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export function limit(val, min = 0, max = Infinity) {
    return Math.max(Math.min(val, max), min);
}

// 判断字符串中是否含汉字
export function includeChinese(str) {
    return str.match(/[\u4E00-\u9FA5]/) !== null;
}

// 计算两点的中心点(用于确认摆放在连接线上的文字的位置)
export function getCenter([x1, y1], [x2, y2]) {
    return [
        (x1 + x2) / 2, 
        (y1 + y2) / 2
    ]
}

// 计算两点角度
export function getAngle([x1, y1], [x2, y2], deg = false, abs = false) {
    var [dx, dy] = [x2 - x1, y2 - y1].map(e => (abs ? Math.abs(e) : e));
    let res = Math.atan2(dy, dx);
    deg && (res = res / Math.PI * 180);
    return res;
}

// 求无权有向图某个起始顶点到所有其他顶点的最短路径，如果无法通达，则路径为null
// @return (number[] | null)[]
export function getPaths(
    startIndex,
    nodes,
    getAdjacent,
    filter = () => true
) {
    const dists = new Array(nodes.length).fill(Infinity);
    const paths = new Array(nodes.length).fill(null);
    const queue = [];
    const stNode = nodes[startIndex];
 
    queue.push({ i: startIndex, v: stNode, p: [startIndex], d: 0 });
    while(queue.length) {
        const { i, v, p, d } = queue.shift();
        if(d >= dists[i]) continue;
        dists[i] = d;
        paths[i] = p;
        if(!filter(v)) continue; // 边过滤器，如果不符合要求则不考虑其邻接顶点

        // 遍历邻接顶点
        for(const wi of getAdjacent(i)) {
            const w = nodes[wi];
            if(!w) continue;

            queue.push({ i: wi, v: w, p: p.concat(wi), d: d + 1 });
        }
    }

    return paths;
}

// 查找一组可能不连通的顶点中所有无入边的顶点(root)，并按由它们出发的连通子图分组
export function getDiagramGroups(
    nodes, 
    getAdjacent,
    getRevAdjacent
) {
    const roots = [...nodes.entries()]
        .filter(e => !getRevAdjacent(e[0]).length);
    const groups = [];
    for(const [root] of roots) {
        const path = getPaths(root, nodes, getAdjacent);
        groups.push(nodes.filter((e, i) => path[i] !== null));
    }
    return groups;
}

// Tarjan算法求有向图所有的强连通分量(SCC)
// SCC构成一个新的有向图的顶点，且该有向图必为有向无环图(DAG)
// 返回所有SCC的数组，每个数组元素含三条属性描述一个SCC：包括每个分量所含顶点、内部顶点间的关系，及分量间的关系
export function getScc(
    startIndex, 
    nodes, 
    getAdjacent, 
    getRevAdjacent
) {
    const { min } = Math;
    const components = [], stack = [];
    const dfn = new Array(nodes.length).fill(Infinity); // 该顶点遍历到的次序
    const low = new Array(nodes.length).fill(Infinity); // 该顶点可通达顶点列表中的最小dfn
    let d = 0;
    const dfs = (v) => {
        stack.push(v);
        dfn[v] = ++d;
        low[v] = min(low[v], d);
        for(const w of getAdjacent(v)) {
            const wAt = stack.indexOf(w);
            if(dfn[w] === Infinity) {
                dfs(w);
                low[v] = min(low[v], low[w]);
            } else if(wAt >= 0) {
                low[v] = min(low[v], dfn[w]);
            } 
        }
        if(dfn[v] === low[v]) { 
            // 将该顶点之上的栈元素全部出栈，记入一个分量中
            const vAt = stack.indexOf(v);
            components.push(stack.splice(vAt));
        }
    }
    dfs(startIndex);
    // 结果返回结构处理
    const map = new Map();
    components.forEach((c, i) => c.forEach(v => map.set(v, i)));
    return components.map((c, i) => {
        const reduceMap = (prop) => (o, v) => o.concat(prop(v).map(e => map.get(e)));
        const outs = c.reduce(reduceMap(getAdjacent), []);
        const outer = { outs: [...new Set(outs)] } // 分量对外(分量之间)的有向关系
        const inner = c.reduce( // 分量内部顶点间的有向关系
            (o, v) => o.concat(getAdjacent(v).filter(e => map.get(e) === i).map(e => [v, e])), 
        []) 
        if(getRevAdjacent) {
            const ins = c.reduce(reduceMap(getRevAdjacent), []);
            outer.ins = [...new Set(ins)];
        }
        return { nodes: c, inner, outer };
    });
}

// 求有向图中的所有环，采用Johnson算法（返回所有存在的循环依赖）
export function getCircuits(nodes, getAdjacent) {
    const res = [], stack = [];
    const B = new Array(nodes.length).fill(new Set());
    const blocked = new Array(nodes.length).fill(false);
    
    const unblock = (u) => {
        blocked[u] = false;
        for(const w of B[u]) {
            B[u].delete(w);
            if(blocked[w]) unblock(w);
        }
    }
    const circuit = (ak, s, v = s) => {
        let f = false;
        stack.push(v);
        blocked[v] = true;
        const adjv = ak.inner
            .filter(e => e[0] === v)
            .map(e => e[1]);
        for(const w of adjv) {
            if(w === s) {
                res.push(stack.slice());
                f = true;
            } else if(!blocked[w]) {
                if(circuit(ak, s, w))
                    f = true;
            }
        }
        if(f) unblock(v);
        else for(const w of adjv) {
            B[w].add(v);
        }
        stack.pop();
        return f;
    }

    const sccs = getScc(0, nodes, getAdjacent)
        .filter(e => e.nodes.length > 1);

    for(const scc of sccs) {
        stack.splice(0);
        const s = scc.nodes[0];
        const vk = scc.nodes;
        for(const v of vk) {
            blocked[v] = false;
            B[v] = new Set();
        }
        
        circuit(scc, s);
    }
    return res;
}