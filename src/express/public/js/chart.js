import { getLength, getCenter, getPaths, getAngle, includeChinese, limit } from "./utils.js";
import NodeMenu from "./chartMenu.js";
export class Link { 
    constructor(source, target, meta) {
        this.source = source;
        this.target = target;
        this.meta = meta;
    }

    length() {
        const { x: x1, y: y1 } = this.source;
        const { x: x2, y: y2 } = this.target;
        return getLength(x1, y1, x2, y2);
    };

    // 获取边上标签的位置
    getNoteTransform(rotate = false) {
        const { source: s, target: t } = this;
        const p = getCenter(s.x, s.y, t.x, t.y);
        let angle = getAngle([s.x, s.y], [t.x, t.y], true, true);
        rotate && (angle -= 90);
        if ((s.x > t.x && s.y < t.y) || (s.x < t.x && s.y > t.y)) {
            angle = -angle;
        }
        return `translate(${p.x}, ${p.y}) rotate(${angle})`;
    }
}

export class Node {
    constructor(dataIndex, data) {
        this.dataIndex = dataIndex;
        this.data = data;
        [this.vx, this.vy] = [0, 0];
        [this.x, this.y] = [0, 0];
    }
}

export default class Chart {
    constructor(svg, data, initOptions = {}) {
        this.svg = svg;
        this.data = data;
        this.scale = {
            width: globalThis.innerWidth,
            height: globalThis.innerHeight
        }
        this.init(initOptions);
    }

    init(initOptions) {
        this.options = {
            showDesc: true, // 显示依赖包简要信息
            showExtraneous: true, // 显示游离顶点(无被依赖的额外包)
            highlightRequiring: true, // 高亮出边(橙色)
            highlightRequiredBy: true, // 高亮入边(绿色)
            highlightPath: true, // 高亮根出发路径(青色)
            fading: true, // 淡化非聚焦顶点
            simulationStop: false, // 暂停力导模拟
            ...initOptions
        }
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
        this.nodes = data.map((e, i) => new Node(i, e));
        const { nodes } = this;

        // 计算由根顶点到所有顶点的依赖路径
        this.requirePaths = getPaths(0, nodes, e => e.data.requiring);
        
        this.vsbNodes = []; // 实际显示的顶点
        this.vsbLinks = []; // 实际显示的边

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
            n.showRequiring = !i;
        })
    }

    // 根据showNode和showRequiring更新实际显示
    updateNodes() { 
        const shown = n => n.showNode;
        this.vsbNodes = this.nodes.filter(shown);
        //vsbNodes.push(...nodes.filter(n => !vsbNodes.includes(n) && shown(n)));
    };

    // 根据showNode和showRequiring更新边，边的列表采取懒加载模式
    updateLinks() {
        const shown = l => l.source.showRequiring && l.target.showNode;
        const { nodes } = this;
        this.vsbLinks = this.vsbNodes.reduce(
            (o, { data: d, dataIndex: i }) => o.concat(
                d.requiring.map((t, ti) => new Link(nodes[i], nodes[t], nodes[i].data.meta[ti])
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
        this.linkg = g.append("g");
        // 顶点的组
        this.nodeg = g.append("g");
        const { linkg, nodeg } = this;

        this.link = linkg.selectAll("line");
        this.label = nodeg.selectAll("text");
        this.circle = nodeg.selectAll("circle");
    }

    // 创建力导模拟仿真器
    initSimulation() {
        const ct = this;

        this.simulation = d3
            .forceSimulation(ct.vsbNodes)
            .force("link", d3.forceLink(ct.vsbLinks).distance(150).strength(0.4)) // 拉扯力
            .force("charge", d3.forceManyBody().strength(d => -Math.log2(d.r) * 100)) // 排斥力
            .force("collide", d3.forceCollide().radius(d => d.r + 2).strength(-1)) // 碰撞力
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
            .attr("dx", function() {
                return - this.getBBox().width / 2;
            });
        // 线的两端应该在结点圆的边上
        const { sin, cos } = Math;
        const proj = (d, cir, ofs, f) =>
            (cir.r + ofs) * f(getAngle([d.source.x, d.source.y], [d.target.x, d.target.y]));
        this.link
            .attr("x1", d => d.source.x + proj(d, d.source, 0, cos))
            .attr("y1", d => d.source.y + proj(d, d.source, 0, sin))
            .attr("x2", d => d.target.x - proj(d, d.target, -2, cos))
            .attr("y2", d => d.target.y - proj(d, d.target, -2, sin));
        this.linkNote
            ?.attr('transform', d => d.getNoteTransform(d.rotate))
            .attr('textLength', limitLen);
    }

    // 根据顶点的属性特征，获取顶点的样式类型名（可重叠）
    getNodeClass(node, vi, append = true) {
        const { requirePaths, link } = this;
        // 顶点类型判断数组
        // [判断方法, 顶点类型名, 样式类名（在chart.scss中定义）, ...(可以继续附加一些值)]，下标越大优先级越高
        const nodeType = [
            [true, "", "node"],
            [true, "", "hidden-node"], // 未展开边的默认顶点
            [(n) => n.showRequiring && n.data.requiring.length, "", "transit-node"], // 已展开边，有入边有出边的顶点，即有依赖且被依赖的包
            [(n, i, li) => li.length && li.every(l => l.meta.depthEnd), "递归终点", "depth-end-node"], // 所有的入边均为递归深度到达最大的边的顶点
            [(n) => !n.data.requiring.length, "", "terminal-node"], // 无出边的顶点，即无依赖的包
            [(n, i) => requirePaths[i] === null, "未使用", "free-node"], // 无法通向根顶点的顶点，即不必要的包
            [(n, i) => n.data.path === null, "未安装", "not-found-node"], // 没有安装的包
            [(n) => n.data.requiredBy.includes(0), "主依赖", "direct-node"], // 根顶点的相邻顶点，即被项目直接依赖的包
            [(n, i) => !i, "主目录", "root-node"], // 根顶点，下标为0的顶点，代表根目录的项目包
        ];

        const { dataIndex: i } = node;
        const linkIn = link.filter(l => l.target === node).data();
        const linkOut = link.filter(l => l.source === node).data();
        const r = v => typeof v === 'function' ? v(node, i, linkIn, linkOut) : v;
        // 根据判断数组获取顶点类型所映射的属性值的函数
        if(append) { // 根据nodeType现有的属性值增加类名
            return nodeType.reduce((o, e) => r(e[0]) && e[vi] ? o.concat(r(e[vi])) : o, []).join(" ");
        } else {
            return nodeType.reduce((o, e) => r(e[0]) && e[vi] ? r(e[vi]) : o, nodeType[0][vi]);
        }
    }

    // 根据边的属性特征，获取边的样式类型名(可重叠)
    getLinkClass(link, vi, append = true) {
        const linkType = [
            [true, "", "link"],
            [(l) => l.meta.optional, "", "optional-link"], // 可选依赖表示为虚线（chart.scss中定义）
            [(l) => l.meta.type === "dev", "开发", null], // 开发依赖(devDependecies)的边
            [(l) => l.meta.type === "peer", "同级", null], // 同级依赖(peerDependencies)的边
            [(l) => l.meta.depthEnd, "", "depth-end-link"], // 递归深度达到上限的边
            [(l) => !l.meta.optional && l.meta.invalid, (l) => l.meta.range, "invalid-link"], // 非法依赖版本的边，标签显示合法版本范围
            [(l, i, t) => !l.meta.optional && t.data.path === null, "未安装", "invalid-link"] // 未安装该依赖的边，样式和非法一致
        ];

        const { source: s,  target: t } = link;
        const r = v => typeof v === 'function' ? v(link, s, t) : v;
        if(append) {
            return linkType.reduce(
                (o, e) => r(e[0]) && e[vi] ? o.concat(r(e[vi])) : o, []
            ).join(" ");
        } else {
            return linkType.reduce((o, e) => r(e[0]) && e[vi] ? r(e[vi]) : o, linkType[0][vi]);
        }
    }

    // 显示每条边上附加的文字标注
    showLinkNote(link) {
        this.linkNote = this.linkg
            .selectAll('text')
            .data(link.data())
            .join('text')
            .attr('class', (d) => link.filter(e => d === e).attr('class'))
            .each(d => d.text = this.getLinkClass(d, 1, false))
            .each(d => d.rotate = includeChinese(d.text))
            .text(d => d.text)
            // 如果标注带有汉字则转为竖排显示
            .classed('chinese-note', d => d.rotate)
            .attr('transform', d => d.getNoteTransform(d.rotate))
            .attr('textLength', limitLen)

        this.linkNote.filter(':not(.chinese-note)')
            .attr('dx', offset(0, null))
            .attr('dy', offset(null, 10));
        this.linkNote.filter('.chinese-note')
            .attr('dx', offset(5, null))
            .attr('dy', offset(null, 0));
        
        function offset(x, y) { 
            return function() {
                const { width: w, height: h } = this.getBBox();
                return (x !== null && -w / 2 + x) + (y !== null && -h / 2 + y);
            }
        }
    }

    hideLinkNote() {
        this.linkNote.remove();
    }

    // 显示某个顶点，以及由根到该顶点的最短依赖路径上的所有顶点
    showNode(index, hideOthers = false) {
        const { nodes, requirePaths } = this;
        if (index >= nodes.length) return;
        if(hideOthers) this.resetNodes();
        if(requirePaths[index]) {
            requirePaths[index].forEach(i => { 
                i === index ? (nodes[i].showNode = true) : this.showRequiring(i)
            });
        } else { nodes[index].showNode = true; }
    }

    // 显示顶点的所有相邻顶点，即该包的依赖
    showRequiring(index) {
        const { nodes } = this;
        if(index >= nodes.length) return; 
        const node = nodes[index];
        node.showRequiring = true;
        node.data.requiring.forEach((e) => nodes[e].showNode = true);
    }

    // 隐藏顶点本身，并自动清除因顶点隐藏而产生的游离顶点
    hideNode(node, keepNode = false, excludes = []) {
        const { nodes, vsbNodes, requirePaths } = this;
        const all = vsbNodes.filter(
            n => !excludes.includes(n) && n.dataIndex && 
                !nodes[0].data.requiring.includes(n.dataIndex)
        ); 
        // 根顶点和其相邻顶点无法隐藏
        if(!all.includes(node)) return;

        if(!keepNode) [node.showNode, node.showRequiring] = [false, false];
        // 隐藏所有当前无法通向根顶点的顶点，防止额外游离顶点产生
        // 获取当前所有显示顶点通向根顶点的路径，无路径者(游离)为null
        const getVsbPaths = (nodeSet) => getPaths(0, nodeSet, 
            n => n.data.requiring, 
            n => n.showNode && n.showRequiring); 
        let rest = all, vsbPaths = getVsbPaths(nodes);
        // 过滤，每次仅保留满足无法通向根顶点条件的顶点，并进行循环操作
        const filter = n => 
            (n.showNode || n.showRequiring) && 
            requirePaths[n.dataIndex] !== null && 
            vsbPaths[n.dataIndex] === null;
        while((rest = rest.filter(filter)).length) {
            rest.forEach(n => [n.showNode, n.showRequiring] = [false, false]); 
            console.log(vsbPaths = getVsbPaths(rest));
        }
    }
    
    // 隐藏顶点的所有边，不隐藏顶点本身
    hideBorders(node) {
        if(!node.dataIndex) return;
        node.showRequiring = false;
        this.vsbNodes
            .filter(n => node.data.requiring.includes(n.dataIndex))
            .forEach(n => this.hideNode(n, true, [node]));
    }

    // 右键菜单事件
    updateOptions() {
        this.circle.on('contextmenu', d3.contextMenu(NodeMenu(this)));
    }

    // 根据顶点showNode和showRequiring属性的变化更新有向图
    update() {
        this.updateNodes();
        this.updateLinks();

        const ct = this;
        const { vsbLinks, vsbNodes, simulation, desc } = ct;

        console.log('当前边数：', vsbLinks.length, "，顶点数：", vsbNodes.length);

        // 各enter仅指代随着数据更新，新加进来的元素
        let linkEnter, labelEnter, circleEnter; 

        // 有向边
        ct.link = this.linkg
            .selectAll("line")
            .data(vsbLinks, d => d.dataIndex)
            .join(
                enter => linkEnter = enter.append("line"),
                update => update, 
                exit => exit.remove()
            )

        linkEnter
            .attr("from", (d) => d.source.dataIndex)
            .attr("to", (d) => d.target.dataIndex)
            .attr("class", (d) => ct.getLinkClass(d, 2))
            .attr("stroke-opacity", 0.6)
            .attr('marker-end', 'url(#marker)');
        
        // 顶点圆圈
        ct.circle = this.nodeg
            .selectAll("circle")
            .data(vsbNodes, d => d.dataIndex)
            .join(
                enter => circleEnter = enter.append('circle'), 
                update => update, 
                exit => exit.remove()
            )
            .attr("class", (d) => ct.getNodeClass(d, 2))
        circleEnter 
            .attr("index", (d) => d.dataIndex)
            // 根顶点半径为5px起步，否则3.5px
            .each(d => d.r = (d.dataIndex ? 3.5 : 5) * (1 + d.data.requiring.length * 0.05))
            .attr("r", (d) => d.r)
            .call(drag(simulation))
            .on("click", function(e) { ct.clickNode(this, e) })
            .on("mouseover", function(e) { ct.mouseOverNode(this, e) })
            .on("mouseout", function(e) {  // 鼠标离开某个顶点
                desc.text('');
                d3.select(this).attr('stroke', null);

                const getClass = d => ct.getNodeClass(d, 2);
                ct.label.attr('class', getClass);
                ct.circle.attr('class', getClass);
                ct.link.attr('class', d => ct.getLinkClass(d, 2));
                ct.hideLinkNote();
            })

        // 悬停标签提示
        ct.circle.selectAll('title').remove();
        ct.circle.filter(d => d.data.requiring.length && !d.showRequiring)
            .append('title')
            .text('点击显示依赖');

        // 顶点标签
        ct.label = this.nodeg
            .selectAll("text")
            .data(vsbNodes, d => d.dataIndex)
            .join(
                enter => labelEnter = enter.append('text'),
                update => update,
                exit => exit.remove()
            )
        labelEnter
            .attr("index", (d) => d.dataIndex)
            .attr("class", (d) => ct.getNodeClass(d, 2))
            .attr('dy', d => -d.r - 2)
            .text(d => d.data.id + (
                // 如果有同名包，则在标签上后缀版本
                ct.nodes.filter(n => n.data.id === d.data.id).length >= 2 ?
                    ('@' + d.data.version) : '' 
            )).call(drag(simulation))
        
        // 更新力导模拟
        const { log2, max } = Math;
        const alpha = max(log2(1 + circleEnter.size()) * 0.1, 0.1);
        console.log('alpha', alpha);
        this.options.simulationStop = false;
        simulation.nodes(vsbNodes);
        simulation.force('link').links(vsbLinks);
        simulation.alpha(alpha).restart();

        this.updateOptions();
    }
    
    // 鼠标点击顶点事件
    clickNode(eThis, node) {
        const { data: { requiring }, dataIndex: i } = node;
        console.log('点击顶点', i, eThis, node, this.requirePaths[i]);
        if(!requiring.length) return;
        this.showRequiring(i);
        this.update();
    }
    
    // 鼠标移动到某个顶点上时的事件
    mouseOverNode(eThis, node) { 
        const { 
            desc, circle, 
            label, link, 
            requirePaths, 
            options: {
                showDesc,
                highlightRequiring: hlrq, 
                highlightRequiredBy: hlrb,
                highlightPath: hlp, fading
            }
        } = this;
        console.log('悬停', node.dataIndex);
        if(showDesc) {     
            desc
                .call(appendLine, `名称: ${node.data.id}\n`)
                .call(appendLine, `版本: ${node.data.version}\n`)
                .call(appendLine, `目录: ${node.data.path}\n`)
                .call(appendLine, `依赖: ${node.data.requiring.length}个包`)
                .call(appendLine, this.getNodeClass(node, 1));
        }

        const { requiring: outs, requiredBy: ins } = node.data;
        // 返回一个函数：判断一条边link是否在路径顶点集nodeSet上，用于过滤边
        const onPath = (nodeSet) => (link) => nodeSet &&
            nodeSet.includes(link.source.dataIndex) && 
            nodeSet.includes(link.target.dataIndex);

        // 将该顶点的出边和其目标顶点（依赖包）显示为橙色
        if(hlrq) {
            const outFtr = d => outs.includes(d.dataIndex);
            circle.filter(outFtr).classed('out-node', true);
            label.filter(outFtr).classed('out-node', true);
            link.filter(d => d.source === node).classed('out-link', true);
        }
        // 将该顶点的入边和其源头顶点（被依赖包）显示为绿色
        if(hlrb) {
            const inFtr = d => ins.includes(d.dataIndex);      
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
        const allUpFtr = d => 
            (hlrq && d.source === node) ||
            (hlrb && d.target === node) ||
            (hlp && onPath(paths)(d))
        this.showLinkNote(link.filter(allUpFtr));

        // 弱化所有上述之外顶点的存在感
        if(fading) {
            const allUp = [].concat(hlrb ? ins : [], hlrq ? outs : [], paths ?? []);
            const exptFtr = d => !allUp.includes(d.dataIndex);
            circle.filter(exptFtr).classed('except-node', true);
            label.filter(exptFtr).classed('except-node', true);
        }

        // 将该顶点显示为红色
        d3.select(eThis).classed('focus-node', true);
        label.filter(`[index="${node.dataIndex}"]`).classed('focus-node', true);
    }
}

// 拖拽事件
const drag = (simulation) => {
    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
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
const appendLine = (target, text, style = '', lineHeight = '1.2em') => {
    target
        .append('tspan')
        .attr('x', target.attr('x'))
        .attr('dy', lineHeight)
        .attr('style', style)
        .text(text);
}

// 获取限制的文本宽度
const limitLen = (link) => 
    limit(link.length() * 0.4, 22, 33);

// 图标定义
const defs = (container) => {
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