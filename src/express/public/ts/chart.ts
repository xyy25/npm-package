/* 力导图封装类的ts版本，与chart.js需要同步更新，为之后留作备用 */
import * as d3 from 'd3';
import D3Menu from "./lib/d3-context-menu";
import { DiagramNode, DirectedDiagram } from "./types";
import { nodeMenu } from "./chartMenu";
import { getPaths, getScc, includeChinese, limit } from "./utils";
import { Node, Link } from './chartNode';

const createMenu = D3Menu<any, any>(d3);

export type ChartOption = {
    showDesc: boolean,
    showExtraneous: boolean,
    highlightRequiring: boolean,
    highlightRequiredBy: boolean,
    highlightPath: boolean,
    highlightComponent: boolean,
    fading: boolean,
    simulationStop: boolean
}

export type Scale = {
    width: number,
    height: number
}

namespace Chart {
    export type ResolveNode<T> = T extends NodeIterCallback<infer P> ? P : T;
    type NodeIterCallback<RetType = string> = (n: Node, i: number, li: Link[], lo: typeof li) => RetType;
    export type NodeClassifyArray = [
        boolean | NodeIterCallback<boolean>, 
        string | NodeIterCallback | null, 
        string | NodeIterCallback | null
    ][]

    export type ResolveLink<T> = T extends LinkIterCallback<infer P> ? P : T;
    type LinkIterCallback<RetType = string> = (link: Link, source: Node, target: Node) => RetType;
    export type LinkClassifyArray = [
        boolean | LinkIterCallback<boolean>, 
        string | LinkIterCallback | null, 
        string | LinkIterCallback | null
    ][]
}

export default class Chart {
    constructor(
        public svg: d3.Selection<any, any, any, any>, 
        public data: DirectedDiagram, 
        initOptions: Partial<ChartOption> = {}
    ) {
        this.scale = {
            width: globalThis.innerWidth,
            height: globalThis.innerHeight
        }
        this.options = {
            showDesc: true, // 显示依赖包简要信息
            showExtraneous: true, // 显示游离顶点(无被依赖的额外包)
            highlightRequiring: true, // 高亮出边(橙色)
            highlightRequiredBy: true, // 高亮入边(绿色)
            highlightPath: true, // 高亮根出发路径(青色)
            highlightComponent: true, // 高亮所属强连通分量(红色)
            fading: true, // 淡化非聚焦顶点
            simulationStop: false, // 暂停力导模拟
            ...initOptions
        }
        this.init();
    }
    scale: Scale
    options: ChartOption
    nodes: Node[] = []
    vsbNodes: Node[] = []
    vsbLinks: Link[] = []
    marked: number[] = []
    requirePaths: (number[] | null) [] = []
    g: d3.Selection<SVGGElement, any, any, any> = d3.select('body');
    desc: d3.Selection<SVGTextElement, any, any, any> = d3.select('body');
    linkg: d3.Selection<SVGGElement, any, any, any> = d3.select('body');
    nodeg: d3.Selection<SVGGElement, any, any, any> = d3.select('body');
    cellg: d3.Selection<SVGGElement, any, any, any> = d3.select('body');
    link: d3.Selection<SVGPathElement | d3.BaseType, Link, any, any> = d3.selectAll('body');
    linkNote?: d3.Selection<SVGTextElement | d3.BaseType, Link, any, any>;
    circle: d3.Selection<SVGCircleElement | d3.BaseType, Node, any, any> = d3.selectAll('body');
    label: d3.Selection<SVGTextElement | d3.BaseType, Node, any, any> = d3.selectAll('body');
    cell: d3.Selection<SVGPathElement | d3.BaseType, Node, any, any> = d3.selectAll('body');
    simulation: d3.Simulation<Node, Link> = d3.forceSimulation();
    
    init() {
        this.initData();
        this.initDiagram();
        this.initSimulation();
        
        const { nodes, vsbLinks } = this;
        console.log(nodes, vsbLinks);

        this.update();
    }

    initData() {
        const { data } = this;

        // Compute the graph and start the force simulation.
        //const root = d3.hierarchy(data[0]);
        //const links = root.links();
        //const nodes = root.descendants();
    
        // 根据数据生成有向图的顶点和边信息
        this.nodes = data.map((e: DiagramNode, i: number) => new Node(i, e));
        const { nodes } = this;

        // 计算由根顶点到所有顶点的依赖路径
        this.requirePaths = getPaths(0, nodes, (i) => nodes[i].data.requiring);
        // 计算强连通分量，并给每个顶点的mate属性赋值同一分量成员的顶点下标数组
        const components = getScc(0, nodes, 
            i => nodes[i].data.requiring, 
            i => nodes[i].data.requiredBy);
        components.filter(c => c.nodes.length > 1).forEach(c => 
            c.nodes.forEach(n => nodes[n].mate = c.nodes)
        );
        
        this.vsbNodes = []; // 实际显示的顶点
        this.vsbLinks = []; // 实际显示的边
        this.marked = []; // 标记的顶点

        this.resetNodes();
        this.updateNodes();
        this.updateLinks();
    }

    // 重置视图（重置顶点和边的隐藏显示）
    resetNodes() { 
        const ct = this;
        const { nodes, options: { showExtraneous } } = ct;
        nodes.forEach(n => {
            const { dataIndex: i, data: { requiredBy } } = n;
            // 初始化有向图时，只显示根顶点、直接顶点、游离顶点
            n.showNode = !i || requiredBy.includes(0);
            n.showNode ||= showExtraneous && ct.requirePaths[i] === null;
            n.showNode ||= ct.marked.includes(n.dataIndex);
            n.showRequiring = !i;
        })
    }

    // 根据showNode和showRequiring更新实际显示
    updateNodes() { 
        const shown = (n: Node) => n.showNode;
        this.vsbNodes = this.nodes.filter(shown);
        //vsbNodes.push(...nodes.filter(n => !vsbNodes.includes(n) && shown(n)));
    };

    // 根据showNode和showRequiring更新边，边的列表采取懒加载模式
    updateLinks() {
        const isMate = (a: Node, b: Node) => 
            a.showNode && b.showNode && a.mate.includes(b.dataIndex);
        const shown = (l: Link) => 
            (l.source.showRequiring && l.target.showNode) || isMate(l.source, l.target);
        const { nodes } = this;
        this.vsbLinks = this.vsbNodes.reduce(
            (o: Link[], { data: d, dataIndex: i }) => o.concat(
                d.requiring.map((t: number, ti: number) => 
                    new Link(nodes[i], nodes[t], nodes[i].data.meta[ti])
        )), []).filter(shown);
        //vsbLinks.push(...links.filter(l => !vsbLinks.includes(l) && shown(l)));
    };

    initDiagram() {
        const { svg } = this;

        this.g = svg.append('g');
        const { g } = this;

        defs(g);

        // 创建zoom操作
        var zoom = d3
            .zoom()
            // 设置缩放区域为0.1-100倍
            .scaleExtent([0.1, 100])
            .on("zoom", () => {
                // 子group元素将响应zoom事件，并更新transform状态
                const { x, y, k } = d3.event.transform;
                g.attr("transform", `translate(${x}, ${y}) scale(${k})`);
            });

        // 绑定zoom事件，同时释放zoom双击事件
        svg.call(zoom).on("dblclick.zoom", () => {});

        const { width, height } = this.scale;
        // 左上角文字描述
        this.desc = svg
            .append("g")
            .append("text")
            .attr("id", "desc")
            .attr("x", - width / 2)
            .attr("y", - height / 2)
            .style('font-size', 24);

        // 边的组
        this.linkg = g.append("g").attr("id", "linkg");
        // 顶点的组
        this.nodeg = g.append("g").attr("id", "nodeg");

        this.cellg = g.append("g").attr("id", "cellg");

        const { linkg, nodeg, cellg } = this;

        this.link = linkg.selectAll("path");
        this.label = nodeg.selectAll("text");
        this.circle = nodeg.selectAll("circle");
        this.cell = cellg.selectAll(".cell");
    }

    // 创建力导模拟仿真器
    initSimulation() {
        const ct = this;

        this.simulation = d3
            .forceSimulation(ct.vsbNodes)
            .force("link", d3.forceLink(ct.vsbLinks).distance(150).strength(0.4)) // 拉扯力
            .force("charge", d3.forceManyBody().strength((d: any) => -Math.log2(d.r) * 100)) // 排斥力
            .force("collide", d3.forceCollide().radius((d: any) => d.r + 2).strength(-1)) // 碰撞力
            .force("x", d3.forceX().strength(0.1))
            .force("y", d3.forceY().strength(0.1));

        this.simulation.on("tick", () => this.tick());
    }

    // 力导模拟每帧更新回调函数
    tick() {
        if(this.options.simulationStop) return;
        this.circle
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        this.label
            .attr("x", d => d.x)
            .attr("y", d => d.y)
            .attr("dx", function(this: any) {
                return - this.getBBox().width / 2;
            });
        this.link.attr("d", d => d.getLinkPath());
        this.linkNote
            ?.attr('textLength', limitLen)
            .attr('rotate', d => d.getNoteFlip() ? '180' : '0')
            .select('textPath')
            .text(d => d.getNoteFlip() ? d.text.split('').reverse().join('') : d.text);
    }

    // 顶点类型判断数组
    // [判断函数, 顶点类型名, 样式类名（在chart.scss中定义）, ...(可以继续附加一些值)]，下标越大优先级越高
    readonly nodeType: Chart.NodeClassifyArray = [
        [true, "", "node"],
        [true, "", "hidden-node"], // 未展开边的默认顶点
        [(n) => n.showRequiring && !!n.data.requiring.length, "", "transit-node"], // 已展开边，有入边有出边的顶点，即有依赖且被依赖的包
        [(n, i, li) => !!li.length && li.every(l => l.meta.depthEnd), "递归终点", "depth-end-node"], // 所有的入边均为递归深度到达最大的边的顶点
        [(n) => !n.data.requiring.length, "", "terminal-node"], // 无出边的顶点，即无依赖的包
        [(n, i) => this.requirePaths[i] === null, "未使用", "free-node"], // 无法通向根顶点的顶点，即不必要的包
        [(n, i) => n.data.dir === null, "未安装", "not-found-node"], // 没有安装的包
        [(n) => n.data.requiredBy.includes(0), "主依赖", "direct-node"], // 根顶点的邻接顶点，即被项目直接依赖的包
        [(n, i) => this.marked.includes(i), "标记中", "mark-node"], // 标记中的顶点
        [(n, i) => !i, "主目录", "root-node"], // 根顶点，下标为0的顶点，代表根目录的项目包
    ];

    // 根据顶点的属性特征，获取顶点的样式类型名（可重叠）
    getNodeClass<I extends number>(node: Node, vi: I, append = true): Chart.ResolveNode<(typeof this.nodeType)[0][I]> {
        const { link } = this;

        const { dataIndex: i } = node;
        const linkIn = link.filter(l => l.target === node).data();
        const linkOut = link.filter(l => l.source === node).data();
        const r = (v: any) => typeof v === 'function' ? v(node, i, linkIn, linkOut) : v;
        // 根据判断数组获取顶点类型所映射的属性值的函数
        if(append) { // 根据nodeType现有的属性值增加类名
            return this.nodeType.reduce((o, e) => r(e[0]) && e[vi] ? o.concat(r(e[vi])) : o, []).join(" ") as any;
        } else {
            return this.nodeType.reduce((o, e) => r(e[0]) && e[vi] ? r(e[vi]) : o, this.nodeType[0][vi] ?? null) as any;
        }
    }

    readonly linkType: Chart.LinkClassifyArray = [
        [true, "", "link"],
        [(l) => l.meta.optional, "", "optional-link"], // 可选依赖表示为虚线（chart.scss中定义）
        [(l) => l.meta.type === "dev", "开发", null], // 开发依赖(devDependecies)的边
        [(l) => l.meta.type === "peer", "同级", null], // 同级依赖(peerDependencies)的边
        [(l) => l.meta.depthEnd, "", "depth-end-link"], // 递归深度达到上限的边
        [(l) => !l.meta.optional && l.meta.invalid, (l) => l.meta.range, "invalid-link"], // 非法依赖版本的边，标签显示合法版本范围
        [(l, i, t) => !l.meta.optional && t.data.dir === null, "未安装", "invalid-link"] // 未安装该依赖的边，样式和非法一致
    ];

    // 根据边的属性特征，获取边的样式类型名(可重叠)
    getLinkClass<I extends number>(link: Link, vi: I, append = true): Chart.ResolveLink<(typeof this.linkType)[0][I]> {
        const { source: s,  target: t } = link;
        const r = (v: any) => typeof v === 'function' ? v(link, s, t) : v;
        if(append) {
            return this.linkType.reduce(
                (o, e) => r(e[0]) && e[vi] ? o.concat(r(e[vi])) : o, []
            ).join(" ") as any;
        } else {
            return this.linkType.reduce((o, e) => r(e[0]) && e[vi] ? r(e[vi]) : o, this.linkType[0][vi] ?? null) as any;
        }
    }

    // 显示每条边上附加的文字标注
    showLinkNote(
        linkFilter: d3.ValueFn<any, Link, boolean>, 
        text: d3.ValueFn<any, Link, string> = 
            (d: Link) => this.getLinkClass(d, 1, false) ?? ''
    ) {
        this.linkNote = this.linkg
            .selectAll('text')
            .data(this.link.filter(linkFilter).data())
            .join('text')
            .attr('class', (d) => this.link.filter(e => d === e).attr('class'))
            .each((d, i, g) => d.text = text(d, i, g))
            .each(d => d.rotate = includeChinese(d.text))
            // 如果标注带有汉字则转为竖排显示
            .classed('chinese-note', d => d.rotate)
            .attr('text-anchor', 'middle')
            .attr('textLength', limitLen)
            .attr('rotate', d => d.getNoteFlip() ? '180' : '0')
        
        this.linkNote
            .append('textPath')
            .attr('xlink:href', d => `#link${d.source.dataIndex}-${d.target.dataIndex}`)
            .attr('startOffset', "50%")
            .text(d => d.text)
            .text(d => d.getNoteFlip() ? d.text.split('').reverse().join('') : d.text);
    }

    hideLinkNote() {
        this.linkNote?.remove();
    }

    // 显示某个顶点，以及由根到该顶点的最短依赖路径上的所有顶点
    showNode(indices: number | number[], hideOthers: boolean = false) {
        const { nodes, requirePaths } = this;
        if(hideOthers) this.resetNodes();
        if(!Array.isArray(indices)) {
            indices = [indices];
        }
        indices = indices.filter(i => i >= 0 && i < nodes.length);
        for(const index of indices) {
            nodes[index].showNode = true;
            let path = requirePaths[index];
            if(path !== null) {
                this.showOutBorders(...path.slice(0, path.length - 1));
            }
        }
    }

    // 显示顶点的所有邻接顶点，即该包的依赖
    showOutBorders(...indices: number[]) {
        const { nodes } = this;
        indices = indices
            .filter(i => i >= 0 && i < nodes.length && nodes[i].showNode);
        for(const index of indices) {
            const node = nodes[index];
            node.showRequiring = true;
            node.data.requiring.forEach((i) => nodes[i].showNode = true);
        }
    }

    // 显示顶点的所有入边邻接顶点，即依赖该包的包
    showInBorders(...indices: number[]) {
        const { nodes } = this;
        indices = indices
            .filter(i => i >= 0 && i < nodes.length && nodes[i].showNode);
        for(const index of indices) {
            const node = nodes[index];
            this.showNode(node.data.requiredBy);
            this.showOutBorders(...node.data.requiredBy);
        }
    }

    // 隐藏顶点本身
    hideNode(...indices: number[]) {
        const { nodes, marked } = this;
        // 下面两种顶点无法隐藏，应排除在外：
        // 1. 根顶点和其邻接顶点
        // 2. 标记中的顶点
        const excludes = (n: Node) => !n.dataIndex
            || nodes[0].data.requiring.includes(n.dataIndex)
            || marked.includes(n.dataIndex)
        indices = indices.filter(i => i < nodes.length && !excludes(nodes[i]));
        if(!indices.length) return;

        // 成功隐藏一个顶点时，自动隐藏满足以下条件的邻接顶点：
        // 所处强连通分量，因此次隐藏而导致外部入边全部被隐藏的所有成员顶点
        // 如果该邻接顶点被隐藏，那么属于同一分量的成员也应一同隐藏，防止出现环的问题
        const includes = (n: Node) => n.mate
            .flatMap(i => nodes[i].data.requiredBy)
            .filter(i => !n.mate.includes(i))
            .every(i => !nodes[i].showRequiring);
        const hide = (n: Node) => [n.showNode, n.showRequiring] = [false, false];
        for(const i of indices) {
            const node = nodes[i];
            if(includes(node)) {
                node.mate.forEach(m => hide(nodes[m]));
            }
        }
        this.clearAway(excludes);
    }
    
    // 隐藏顶点的所有边，不隐藏顶点本身，自动清除因依赖隐藏而产生的游离顶点
    hideOutBorders(...indices: number[]) {
        const { nodes } = this;
        indices = indices.filter(i => i > 0 && i < nodes.length);
        const operNodes = indices.map(i => nodes[i]);
        operNodes.forEach(n => n.showRequiring = false);

        const toHide = operNodes
            .reduce<number[]>((o, n) => o.concat(n.data.requiring), []);
        this.hideNode(...toHide);
    }

    // 标记顶点，标记中的顶点无法被隐藏，未显示的顶点无法标记
    markNode(...indices: number[]) {
        const { nodes } = this;
        indices = indices.filter(i => i >= 0 && i < nodes.length && nodes[i].showNode);
        this.marked.push(...indices);
        this.circle.filter(n => indices.includes(n.dataIndex))
            .classed('mark-node', true);
        this.label.filter(n => indices.includes(n.dataIndex))
            .classed('mark-node', true);
    }

    // 取消标记顶点
    unmarkNode(...indices: number[]) {
        const { nodes, requirePaths } = this;
        indices = indices.filter(i => i >= 0 && i < nodes.length);
        this.marked = this.marked.filter(i => !indices.includes(i));
        this.circle.filter(n => indices.includes(n.dataIndex))
            .classed('mark-node', false);
        this.label.filter(n => indices.includes(n.dataIndex))
            .classed('mark-node', false);
        // 隐藏正在游离的
        const vsbPaths = this.getVsbPaths();
        const away = indices.filter(i => vsbPaths[i] === null && requirePaths[i] !== null);
        this.hideNode(...away);
        if(away.length) this.update(0);
    }

    // 获取当前所有显示顶点通向根顶点的路径，无路径者(游离)为null
    getVsbPaths(nodeSet: Node[] = this.nodes): (number[] | null)[] { 
        return getPaths(0, nodeSet, 
            i => this.nodes[i].data.requiring, 
            n => n.showNode && n.showRequiring
        );
    }; 

    // 隐藏所有因当前依赖关系被隐藏而无法通向根顶点的顶点，防止额外游离顶点产生
    // excludes表示对includes的过滤方法，排除不应隐藏的顶点
    clearAway(excludes: (n: Node) => boolean = () => false) {
        const { requirePaths } = this;
        let rest = this.vsbNodes.filter(n => !excludes(n));
        let vsbPaths = this.getVsbPaths();
        // 过滤，每次仅保留满足无法通向根顶点条件的顶点，并进行循环操作
        const filter = (n: Node) => 
            (n.showNode || n.showRequiring) && 
            requirePaths[n.dataIndex] !== null && 
            vsbPaths[n.dataIndex] === null;
        while((rest = rest.filter(filter)).length) {
            rest.forEach(n => [n.showNode, n.showRequiring] = [false, false]); 
            console.log(vsbPaths = this.getVsbPaths());
        }
    }

    // 右键菜单事件
    updateOptions() {
        this.circle.on('contextmenu', createMenu(nodeMenu(this)));
    }

    // 根据顶点showNode和showRequiring属性的变化更新有向图
    update(alpha?: number) {
        this.updateNodes();
        this.updateLinks();

        const ct = this;
        const { vsbLinks, vsbNodes, simulation, desc } = ct;

        console.log('当前边数：', vsbLinks.length, "，顶点数：", vsbNodes.length);

        // 各enter仅指代随着数据更新，新加进来的元素
        let linkEnter: any = ct.link, 
            labelEnter: any = ct.label, 
            circleEnter: any = ct.circle; 

        // 有向边
        ct.link = this.linkg
            .selectAll("path")
            .data(vsbLinks, (d: any) => d.dataIndex)
            .join(
                enter => linkEnter = enter.append("path"),
                update => update, 
                exit => exit.remove()
            );

        linkEnter
            .attr("id", (d: Link) => `link${d.source.dataIndex}-${d.target.dataIndex}`)
            .attr("class", (d: Link) => ct.getLinkClass(d, 2))
            .attr("stroke-opacity", 0.6)
            .attr('marker-end', 'url(#marker)')
            .on('mouseover', (e: Link) => ct.showLinkNote(
                d => d === e, d => d.meta.range
            )).on('mouseout', () => ct.hideLinkNote());

        // 将重叠的边弯曲成曲线显示
        const linkMap = new Map();
        ct.link.each(e => {
            const { 
                source: { dataIndex: si }, 
                target: { dataIndex: ti } 
            } = e, { max, min } = Math;
            e.curve = 0;
            const key = `${min(si, ti)}-${max(si, ti)}`;
            if(!linkMap.has(key)) {
                linkMap.set(key, [e]);
            } else {
                linkMap.get(key).push(e);
            }
        })
        for(const links of linkMap.values()) {
            if(links.length <= 1) continue;
            const odd = !!(links.length % 2);
            
            for(let [i, link] of links.entries()) {
                if(odd && !i) continue;
                odd && i--;
                link.curve = ((i >> 1) + 1) * 45 * (i % 2 ? -1 : 1);
                if(link.target.dataIndex > link.source.dataIndex) 
                    link.curve = -link.curve;
            }
        }

        // 顶点圆圈
        ct.circle = this.nodeg
            .selectAll("circle")
            .data(vsbNodes, (d: any) => d.dataIndex)
            .join(
                enter => circleEnter = enter.append('circle'), 
                update => update, 
                exit => exit.remove()
            )
            .attr("class", (d: Node) => ct.getNodeClass(d, 2))
        circleEnter 
            .attr("index", (d: any) => d.dataIndex)
            // 根顶点半径为5px起步，否则3.5px，并与包的依赖（出边）相关
            .each((d: any) => d.r = (d.dataIndex ? 3.5 : 5) * (1 + d.data.requiring.length * 0.05))
            .attr("r", (d: any) => d.r)
            // 根顶点边粗为2px起步，否则1.5px，并与包的使用（入边）相关
            .each((d: any) => d.s = (d.dataIndex ? 1.5 : 2) * (1 + Math.log10(1 + d.data.requiredBy.length * 0.35))) 
            .attr("stroke-width", (d: any) => d.s)
            .call(drag(simulation))
            .on("click", function(this: any, e: Node) { ct.clickNode(this, e) })
            .on("mouseover", function(this: any, e: Node) { ct.mouseOverNode(this, e) })
            .on("mouseout", function(this: any, e: Node) {  // 鼠标离开某个顶点
                desc.text('');
                d3.select(this).attr('stroke', null);

                const getClass = (d: Node) => ct.getNodeClass(d, 2);
                ct.label.attr('class', getClass);
                ct.circle.attr('class', getClass);
                ct.link.attr('class', d => ct.getLinkClass(d, 2));
                ct.hideLinkNote();
            })

        // 悬停标签提示
        ct.circle.selectAll('title').remove();
        ct.circle.filter((d: any) => d.data.requiring.length && !d.showRequiring)
            .append('title')
            .text('点击显示依赖');

        // 顶点标签
        ct.label = this.nodeg
            .selectAll("text")
            .data(vsbNodes, (d: any) => d.dataIndex)
            .join(
                enter => labelEnter = enter.append('text'),
                update => update,
                exit => exit.remove()
            )
        labelEnter
            .attr("index", (d: any) => d.dataIndex)
            .attr("class", (d: any) => ct.getNodeClass(d, 2))
            .attr('dy', (d: any) => -d.r - 2)
            .text((d: any) => d.data.id + (
                // 如果有同名包，则在标签上后缀版本
                ct.nodes.filter(n => n.data.id === d.data.id).length >= 2 ?
                    ('@' + d.data.version) : '' 
            )).call(drag(simulation));

        ct.cell = this.cellg
            .selectAll(".cell")
            .data(vsbNodes, (d: any) => d.dataIndex)
            .join("path")
            .attr("class", "cell");
            
        // 更新力导模拟
        const { log2, max } = Math;
        alpha ??= max(log2(1 + circleEnter.size()) * 0.1, 0.1);
        console.log('alpha', alpha);
        this.options.simulationStop = false;
        simulation.nodes(vsbNodes);
        simulation.force<d3.ForceLink<Node, Link>>('link')?.links(vsbLinks);
        simulation.alpha(alpha).restart();

        this.updateOptions();
    }
    
    // 鼠标点击顶点事件
    clickNode(eThis: any, node: Node) {
        const { data: { requiring }, dataIndex: i } = node;
        console.log('点击顶点', i, eThis, node, this.requirePaths[i]);
        if(!requiring.length) return;
        this.showOutBorders(i);
        this.update();
    }
    
    // 鼠标移动到某个顶点上时的事件
    mouseOverNode(eThis: any, node: Node) { 
        const { 
            desc, circle, 
            label, link, 
            requirePaths, 
            options: {
                showDesc,
                highlightRequiring: hlrq, 
                highlightRequiredBy: hlrb,
                highlightPath: hlp, fading,
                highlightComponent: hlcp
            }
        } = this;
        console.log('悬停', node.dataIndex);
        if(showDesc) {
            desc
                .call(appendLine, `名称: ${node.data.id}\n`)
                .call(appendLine, `版本: ${node.data.version}\n`)
                .call(appendLine, `目录: ${node.data.dir}\n`)
                .call(appendLine, `依赖: ${node.data.requiring.length}个包`)
                .call(appendLine, `应用: ${node.data.requiredBy.length}个包`)
                .call(appendLine, this.getNodeClass(node, 1));
        }

        const { requiring: outs, requiredBy: ins } = node.data;
        // 返回一个函数：判断一条边link是否在路径顶点集nodeSet上，用于过滤边
        const onPath = (nodeSet: number[] | null) =>
            (link: Link) => !!nodeSet &&
                nodeSet.includes(link.source.dataIndex) &&
                nodeSet.includes(link.target.dataIndex);

        // 将该顶点的出边和其目标顶点（依赖包）显示为橙色
        if(hlrq) {
            const outFtr = (d: Node) => outs.includes(d.dataIndex);
            circle.filter(outFtr).classed('out-node', true);
            label.filter(outFtr).classed('out-node', true);
            link.filter(d => d.source === node).classed('out-link', true);
        }
        // 将该顶点的入边和其源头顶点（被依赖包）显示为绿色
        if(hlrb) {
            const inFtr = (d: Node) => ins.includes(d.dataIndex);      
            circle.filter(inFtr).classed('in-node', true);
            label.filter(inFtr).classed('in-node', true);
            link.filter(d => d.target === node).classed('in-link', true);
        }
        // 将根顶点到该顶点最短路径上的所有顶点和边（最短依赖路径）显示为青色
        const paths = requirePaths[node.dataIndex];
        if(hlp && paths && paths.length > 1) {
            const pathSel = paths.map(ri => `[index="${ri}"]`);
            circle.filter(pathSel.join(',')).classed('path-node', true);
            label.filter(pathSel.join(',')).classed('path-node', true);
            link.filter(onPath(paths)).classed('path-link', true);
        }
        // 将所有依赖到该包的顶点与路径归入这个集(备用)
        // const fills = ins.reduce((o, c) => o.concat(requirePaths[c]), []);
        // link.filter(d => onPath(fills)(d) && !onPath(paths)(d))
        //     .classed('focus-link', true);
        
        // 显示所有上述边的文字标签
        const allUpFtr = (d: Link) => 
            (hlrq && d.source === node) ||
            (hlrb && d.target === node) ||
            (hlp && onPath(paths)(d))
        this.showLinkNote(allUpFtr);

        // 将同一强连通分量的顶点与内部边显示为红色
        let { mate } = node;
        if(hlcp && mate.length > 1) {        
            const compFtr = (d: Node) => mate.includes(d.dataIndex);
            circle.filter(compFtr).classed('focus-component', true);
            label.filter(compFtr).classed('focus-component', true);
            link.filter(onPath(mate)).classed('focus-component', true);
        } else { mate = [node.dataIndex]; }

        // 弱化所有上述之外顶点的存在感
        if(fading) {
            const allUp = mate.concat(hlrb ? ins : [], hlrq ? outs : [], paths ?? []);
            const exptFtr = (d: any) => !allUp.includes(d.dataIndex);
            circle.filter(exptFtr).classed('except-node', true);
            label.filter(exptFtr).classed('except-node', true);
        }

        // 将该顶点显示为红色
        d3.select(eThis)
            .classed('focus-node', true)
            .classed('focus-component', true);
        label.filter(`[index="${node.dataIndex}"]`)
            .classed('focus-node', true)
            .classed('focus-component', true);
    }
}

// 拖拽事件
const drag = (simulation: d3.Simulation<any, any>) => {
    function dragstarted(d: any) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d: any) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d: any) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

// 给文本增加一行
const appendLine = (
    target: d3.Selection<any, any, any, any>, 
    text: any, 
    style = '', 
    lineHeight = '1.2em'
) => {
    target
        .append('tspan')
        .attr('x', target.attr('x'))
        .attr('dy', lineHeight)
        .attr('style', style)
        .text(text);
}

// 获取限制的文本宽度
const limitLen = (link: Link) => {
    const maxlen = link.text?.length * (link.rotate ? 15 : 5)
    return limit(link.length() * 0.4, 22, maxlen);
}

// 图标定义
const defs = (container: d3.Selection<any, any, any, any>) => {
    const defs = container.append('svg:defs');

    // 向defs中添加箭头图标
    defs.append('svg:marker')
        .attr('id', 'marker')
        .attr('markerUnits', 'userSpaceOnUse')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 12)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .attr('stroke-width', 2)
        .append('svg:path')
        .attr('d', 'M2,0 L0,-3 L9,0 L0,3 M2,0 L0,-3')
        .attr('fill', 'grey')
        
    return defs;
}