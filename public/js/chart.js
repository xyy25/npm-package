class Chart {
    constructor(svg, data) {
        this.svg = svg;
        this.data = data;
        this.init();
    }

    init() {
        this.initData();
        this.initDiagram();
        this.initSimulation();

        const { nodes, links } = this;

        this.resetNodes();
        this.updateNodes();
        this.updateLinks();

        console.log(links, nodes);

        this.update();
    }

    initData() {
        const { data } = this;

        // Compute the graph and start the force simulation.
        //const root = d3.hierarchy(data[0]);
        //const links = root.links();
        //const nodes = root.descendants();
    
        // 根据数据生成有向图的顶点和边信息
        this.nodes = data.map((e, i) => {return {
            dataIndex: i, vx: 0, vy: 0, x: 0, y: 0, data: e
        }});
        const { nodes } = this;
        this.links = data.reduce(
            (o, c, i) => o.concat(
                c.requiring.map((t, ti) => { 
                    return { 
                        source: nodes[i], target: nodes[t],
                        meta: nodes[i].data.meta[ti]
                    };
            })
        ), []);

        // 计算由根顶点到所有顶点的依赖路径
        this.requirePaths = getPaths(0, nodes, e => e.data.requiring);
        
        this.vsbNodes = []; // 实际显示的顶点
        this.vsbLinks = []; // 实际显示的边
    }

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

        // svg层绑定zoom事件，同时释放zoom双击事件
        svg.call(zoom).on("dblclick.zoom", () => {});

        const [width, height] = 
            ['width', 'height'].map(e => parseInt(svg.attr(e)));
        // 左上角文字描述
        this.desc = svg
            .append("g")
            .append("text")
            .attr("id", "desc")
            .attr("x", - width / 2 + 100)
            .attr("y", - height / 2 - 100)
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
            .force("link", d3.forceLink(ct.vsbLinks).distance(150).strength(0.25)) // 拉扯力
            .force("charge", d3.forceManyBody().strength(-200)) // 排斥力
            .force("collide", d3.forceCollide(10).strength(-2)) // 碰撞力
            .force("x", d3.forceX().strength(0.1))
            .force("y", d3.forceY().strength(0.1));

        this.simulation.on("tick", () => this.tick());
    }

    // 力导模拟每帧更新回调函数
    tick() {
        this.circle
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        this.label
            .attr("x", d => d.x - 30)
            .attr("y", d => d.y - 5);
        this.link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        this.linkNote
            ?.attr('transform', getTransform)
            .attr('textLength', limitLen);
    }

    resetNodes() { 
        const { nodes } = this;
            nodes.forEach(e => {
            const { requiredBy } = e.data;
            // 初始化有向图时，只显示根顶点、直接顶点、游离顶点
            e.showNode = !e.dataIndex || requiredBy.includes(0) || !requiredBy.length;
            e.showRequiring = !e.dataIndex;
        })
    }

    // 根据showNode和showRequiring更新实际显示
    updateNodes() { 
        const shown = e => e.showNode;
        this.vsbNodes = this.nodes.filter(e => shown(e));
        //vsbNodes.push(...nodes.filter(e => !vsbNodes.includes(e) && shown(e)));
    };

    updateLinks() {
        const shown = e => e.source.showRequiring && e.target.showNode;
        this.vsbLinks = this.links.filter(e => shown(e));
        //vsbLinks.push(...links.filter(e => !vsbLinks.includes(e) && shown(e)));
    };

    // 根据顶点的属性特征，获取顶点的样式类型名（可重叠）
    getNodeClass(node, vi) {
        const { requirePaths } = this;
        // 顶点类型判断数组
        // [判断方法, 顶点类型名, 样式类名（在chart.scss中定义）, ...(可以继续附加一些值)]，下标越大优先级越高
        const nodeType = [
            [() => true, "", "node"],
            [() => true, "", "hidden-node"], // 未展开边的默认顶点
            [(n) => n.showRequiring && n.data.requiring.length, "", "transit-node"], // 已展开边，有入边有出边的顶点，即有依赖且被依赖的包
            [(n) => !n.data.requiring.length, "", "terminal-node"], // 无出边的顶点，即无依赖的包
            [(n, i) => requirePaths[i] === null, "未使用", "free-node"], // 无法通向根顶点的顶点，即不必要的包
            [(n, i) => n.data.requiredBy.includes(0), "主依赖", "direct-node"], // 根顶点的相邻顶点，即被项目直接依赖的包
            [(n, i) => !i, "主目录", "root-node"], // 根顶点，下标为0的顶点，代表根目录的项目包
        ];

        // 根据判断数组获取顶点类型所映射的属性值的函数，d, i是必要传参，vi是属性值所在的数组下标
        // 根据nodeType现有的属性值增加类名
        return nodeType.reduce(
            (o, e) => e[0](node, node.dataIndex) && e[vi] ? o.concat(e[vi]) : o, []
        ).join(" ");
    }

    // 根据边的属性特征，获取边的样式类型名(可重叠)
    getLinkClass(link, vi) {
        const linkType = [
            [() => true, "", "link"],
            [(l) => l.meta.optional, "", "optional-link"], // 可选依赖表示为虚线（chart.scss中定义）
            [(l) => l.meta.type === "dev", "开发", null],
            [(l) => l.meta.type === "peer", "同级", null]
        ];

        return linkType.reduce(
            (o, e) => e[0](link, link.source.dataIndex, link.target.dataIndex) && e[vi] ? o.concat(e[vi]) : o, []
        ).join(" ");
    }

    // 显示每条边上附加的文字标注
    showLinkNote(link) {
        this.linkNote = this.linkg
            .selectAll('text')
            .data(link.data())
            .join('text')
            .attr('class', (d) => link.filter(e => d == e).attr('class'))
            .text((d) => this.getLinkClass(d, 1))
            .style('writing-mode','tb-rl')
            .attr('transform', getTransform)
            .attr('textLength', limitLen)
            .attr('dy', function () {
                return -this.getBBox().height / 2;
            })
            .attr('dx', function () {
                return -this.getBBox().width / 2 + 6;
            })
    }

    hideLinkNote() {
        this.linkNote.remove();
    }

    // 显示某个顶点，以及由根到该顶点的最短依赖路径上的所有顶点
    showNode(index) {
        const { nodes, requirePaths } = this;
        if (index >= nodes.length) return;
        requirePaths[index].forEach(i => { 
            i === index ? (nodes[i].showNode = true) : this.showRequiring(i)
        });
    }

    // 显示顶点的所有相邻顶点，即该包的依赖
    showRequiring(index) {
        const { nodes } = this;
        const node = nodes[index];
        node.showRequiring = true;
        nodes.forEach(
            (n, i) => n.showNode = node.data.requiring.includes(i) ? true : n.showNode
        );
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
        const vsbPaths = () => getPaths(0, nodes, 
            n => n.data.requiring, 
            n => n.showNode && n.showRequiring);
        let rest;
        const filter = n => 
            (n.showNode || n.showRequiring) && 
            requirePaths[n.dataIndex] !== null && 
            vsbPaths()[n.dataIndex] === null;
        while((rest = all.filter(filter)).length)
            console.log(vsbPaths()), rest.forEach(n => [n.showNode, n.showRequiring] = [false, false]);
    }
    
    // 隐藏顶点的所有边，不隐藏顶点本身
    hideBorders(node) {
        if(!node.dataIndex) return;
        node.showRequiring = false;
        this.vsbNodes
            .filter(n => node.data.requiring.includes(n.dataIndex))
            .forEach(n => this.hideNode(n, true, [node]));
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
            .text(d => d.data.id + '@' + d.data.version)
            .call(drag(simulation))
        
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
            .attr("r", (d) => d.dataIndex ? 3.5 : 5) // 根顶点半径为5px，否则3.5px
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
        
        // 右键菜单事件
        const menuData = [
            { title: '隐藏依赖', action: (e) => (ct.hideBorders(e), ct.update()) },
            { title: '重置视图', action: () => (ct.resetNodes(), ct.update()) }
        ];
        circleEnter.on('contextmenu', d3.contextMenu(menuData));

        // 悬停标签提示
        ct.circle.selectAll('title').remove();
        ct.circle.filter(d => !d.showRequiring)
            .append('title')
            .text('点击显示依赖');
            
        // 更新力导模拟
        simulation.nodes(vsbNodes);
        simulation.force('link').links(vsbLinks);
        simulation.alpha(1).restart();
    }
    
    // 鼠标点击顶点事件
    clickNode(eThis, node) {
        console.log('点击顶点', node.dataIndex, node);
        this.showRequiring(node.dataIndex);
        this.update();
    }
    
    // 鼠标移动到某个顶点上时的事件
    mouseOverNode(eThis, node) { 
        const { desc, circle, label, link, requirePaths } = this;
        desc
            .call(appendLine, `名称: ${node.data.id}\n`)
            .call(appendLine, `版本: ${node.data.version}\n`)
            .call(appendLine, `目录: ${node.data.path}\n`)
            .call(appendLine, `依赖: ${node.data.requiring.length}个包`);
        console.log('悬停', node.dataIndex);

        const { requiring: outs, requiredBy: ins } = node.data;
        const outFtr = d => outs.includes(d.dataIndex);
        const inFtr = d => ins.includes(d.dataIndex);
        // 返回一个函数：判断一条边link是否在路径顶点集nodeSet上，用于过滤边
        const onPath = (nodeSet) => (link) =>
            nodeSet.includes(link.source.dataIndex) && 
            nodeSet.includes(link.target.dataIndex)

        // 将该顶点的出边和其目标顶点（依赖包）显示为橙色
        circle.filter(outFtr).classed('out-node', true);
        label.filter(outFtr).classed('out-node', true);
        link.filter(d => d.source == node).classed('out-link', '#d72');

        // 将该顶点的入边和其源头顶点（被依赖包）显示为绿色
        circle.filter(inFtr).classed('in-node', true);
        label.filter(inFtr).classed('in-node', true);
        link.filter(d => d.target == node).classed('in-link', true);

        // 将根顶点到该顶点最短路径上的所有顶点和边（最短依赖路径）显示为青色
        const paths = requirePaths[node.dataIndex];
        if(paths && paths.length > 1) {
            const pathSel = paths.map(ri => `[index="${ri}"]`);
            circle.filter(pathSel.join(',')).classed('path-node', true);
            label.filter(pathSel.join(',')).classed('path-node', true);
            link.filter(onPath(paths)).classed('path-link', true);
        }
        // 将所有依赖到该包的顶点与路径归入这个集
        const fills = ins.reduce((o, c) => o.concat(requirePaths[c]), []);
        link.filter(d => onPath(fills)(d) && !onPath(paths)(d))
            .classed('focus-link', true);

        const allUp = fills.concat(ins, outs, paths ?? []);
        // 显示所有上述边的文字标签
        this.showLinkNote(link.filter(onPath(allUp)));
        // 弱化所有上述之外顶点的存在感
        const exptFtr = d => !allUp.includes(d.dataIndex);
        circle.filter(exptFtr).classed('except-node', true);
        label.filter(exptFtr).classed('except-node', true);

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
const appendLine = (target, text, className, lineHeight = '1.2em') => {
    target
        .append('tspan')
        .attr('x', target.attr('x'))
        .attr('dy', lineHeight)
        .attr('class', className ?? '')
        .text(text);
}

// 获取边上标签的位置
const getTransform = (l) => {
    const { source: s, target: t } = l;
    const p = getCenter(s.x, s.y, t.x, t.y);
    let angle = getAngle(s.x, s.y, t.x, t.y);
    if (s.x > t.x && s.y < t.y || s.x < t.x && s.y > t.y) {
        angle = -angle;
    }
    return `translate(${p.x}, ${p.y}) rotate(${angle})`;
}

const linkLen = (l) => {
    const { x: x1, y: y1 } = l.source;
    const { x: x2, y: y2 } = l.target;
    return getLength(x1, y1, x2, y2);
};

// 获取限制的文本宽度
const limitLen = (l) => 
    limit(linkLen(l) * 0.4, 22, 33);

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