const diag = {
    nodes: null,
    links: null
}

const chart = (svg, data) => {
    const [width, height] = ['width', 'height']
        .map(e => parseInt(svg.attr(e)));
    // Compute the graph and start the force simulation.
    //const root = d3.hierarchy(data[0]);
    //const links = root.links();
    //const nodes = root.descendants();
    
    // 根据数据生成有向图的顶点和边信息
    diag.nodes = data.map((e, i) => {return {
        dataIndex: i, vx: 0, vy: 0, x: 0, y: 0, data: e, 
        // 初始化有向图时，只显示根顶点、直接顶点、游离顶点
        showNode: !i || e.requiredBy.includes(0) || !e.requiredBy.length,
        showRequiring: !i
    }});
    diag.links = data.reduce(
        (o, c, i) => o.concat(
            c.requiring.map(t => { 
                return { source: diag.nodes[i], target: diag.nodes[t] };
        })
    ), []);

    const { nodes, links } = diag;
    // 计算由根顶点到所有顶点的依赖路径
    const requirePaths = getPaths(0, nodes, e => e.data.requiring);

    console.log(links, nodes);

    let vsbNodes = []; // 实际显示的顶点
    let vsbLinks = []; // 实际显示的边

    // 根据showNode和showRequiring更新实际显示
    const updateNodes = () => { 
        const shown = e => e.showNode;
        vsbNodes = nodes.filter(e => shown(e));
        //vsbNodes.push(...nodes.filter(e => !vsbNodes.includes(e) && shown(e)));
    };
    const updateLinks = () => {
        const shown = e => e.source.showRequiring && e.target.showNode;
        vsbLinks = links.filter(e => shown(e));
        //vsbLinks.push(...links.filter(e => !vsbLinks.includes(e) && shown(e)));
    };

    g = svg.append('g');

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


    // 文字描述
    const desc = svg
        .append("g")
        .append("text")
        .attr("x", - width / 2 + 100)
        .attr("y", - height / 2 + 100)
        .style('font-size', 24);

    // 边的组
    const linkg = g.append("g");
    // 顶点的组
    const nodeg = g.append("g");
    
    defs(g);


    updateNodes();
    updateLinks();

    // 创建力导模拟仿真器
    const simulation = d3
        .forceSimulation(vsbNodes)
        .force("link", d3.forceLink(vsbLinks).distance(100).strength(0.1)) // 拉扯力
        .force("charge", d3.forceManyBody().strength(-200)) // 排斥力
        .force("collide", d3.forceCollide(10).strength(-2)) // 碰撞力
        .force("x", d3.forceX().strength(0.1))
        .force("y", d3.forceY().strength(0.1));

    // 顶点类型判断数组
    // [判断方法, 顶点类型名, fill（填充）颜色, stroke（边）颜色, 标签颜色, ...(可以继续附加一些值)]，下标越大优先级越高
    const nodeType = [
        [() => true, "默认顶点", "#ff0", null], // 未展开边的默认顶点
        [(d) => d.showRequiring, "中转顶点", "#fff", "#000"], // 已展开边，有入边有出边的顶点，即有依赖且被依赖的包
        [(d) => !d.data.requiring.length, "终点顶点", "#000", "#fff"], // 无出边的顶点，即无依赖的包
        [(d, i) => i && !d.data.requiredBy.length, "游离顶点", "#bbb", null, "#bbb"], // 除根以外无入边的顶点，即不被依赖的包
        [(d, i) => d.data.requiredBy.includes(0), "直接顶点", null, "#c84"], // 根顶点的相邻顶点，即被项目直接依赖的包
        [(d, i) => !i, "根顶点", null, "#eac"], // 下标为0的顶点，代表根目录的项目包
    ];
    // 根据判断数组获取顶点类型所映射的属性值的函数，d, i是必要传参，vi是属性值所在的数组下标
    // 如nodeType现有的属性值中，fill下标为2，stroke为3
    const getType = (d, i, vi) => nodeType.reduce(
        (o, e) => e[0](d, i) && e[vi] ? e[vi] : o, nodeType[0][vi]
    );

    let link = linkg.selectAll("line");
    let label = nodeg.selectAll("text");
    let circle = nodeg.selectAll("circle");
    let root;

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        circle
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        label
            .attr("x", d => d.x - 30)
            .attr("y", d => d.y - 5);
    });

    // 隐藏顶点
    const hide = (e, excludes = []) => {
        const all = vsbNodes.filter(
            n => !excludes.includes(n) && n.dataIndex && 
                !nodes[0].data.requiring.includes(n.dataIndex)
        ); // 根顶点和其相邻顶点无法隐藏
        if(!all.includes(e)) return;
        console.log('all', all);

        [e.showNode, e.showRequiring] = [false, false];
        // 同时隐藏所有入边都被隐藏的顶点
        let rest;
        const filter = n => 
            (n.showNode || n.showRequiring) && 
            n.data.requiredBy.length && 
            n.data.requiredBy.every(r => !nodes[r].showRequiring);
        while((rest = all.filter(filter)).length)
            console.log(rest.map(e => e.dataIndex)), rest.forEach(n => [n.showNode, n.showRequiring] = [false, false]);
    }

    // 隐藏顶点的所有边
    const hideBorders = (e) => {
        if(!e.dataIndex) return;
        e.showRequiring = false;
        vsbNodes
            .filter(n => e.data.requiring.includes(n.dataIndex))
            .forEach(n => hide(n, [e]));
    }

    const update = () => {
        updateNodes();
        updateLinks();

        console.log('当前边数：', vsbLinks.length, "，顶点数：", vsbNodes.length);

        // 各enter仅指代随着数据更新，新加进来的元素
        let linkEnter, labelEnter, circleEnter; 

        // 有向边
        link = linkg
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
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr('marker-end', 'url(#marker)');

        // 顶点标签
        label = nodeg
            .selectAll("text")
            .data(vsbNodes, d => d.dataIndex)
            .join(
                enter => labelEnter = enter.append('text'),
                update => update,
                exit => exit.remove()
            )
        labelEnter
            .attr("index", (d) => d.dataIndex)
            .style("font-family", "monaco")
            .style("font-weight", (d) => d.dataIndex ? 400 : 800)
            .style("font-size", (d) => d.dataIndex ? 12 : 14)
            .text(d => d.data.id + '@' + d.data.version)
            .call(drag(simulation))
        
        // 顶点圆圈
        circle = nodeg
            .selectAll("circle")
            .data(vsbNodes, d => d.dataIndex)
            .join(
                enter => circleEnter = enter.append('circle'), 
                update => update, 
                exit => exit.remove()
            )
            .attr("fill", (d) => getType(d, d.dataIndex, 2))
            .attr("stroke", (d) => getType(d, d.dataIndex, 3))
        circleEnter
            .attr("index", (d) => d.dataIndex)
            .attr("r", (d) => d.dataIndex ? 3.5 : 5) // 根顶点半径为5px，否则3.5px
            .attr("stroke-width", (d) => d.dataIndex ? 1.5 : 2) // 根顶点边粗为2px，否则1.5px
            .call(drag(simulation))
            .on("click", function(e) { // 鼠标点击顶点事件
                console.log('点击顶点', e.dataIndex, e);
                // 显示该顶点的出边顶点，即该包的依赖
                e.showRequiring = true;
                nodes.forEach(
                    (n, i) => n.showNode = e.data.requiring.includes(i) ? true : n.showNode
                );
                update();
            })
            .on("mouseover", function(e) { // 鼠标移动到某个顶点上
                desc
                    .call(appendLine, `名称: ${e.data.id}\n`)
                    .call(appendLine, `版本: ${e.data.version}\n`)
                    .call(appendLine, `目录: ${e.data.path}\n`)
                    .call(appendLine, `依赖: ${e.data.requiring.length}个包`);

                // 将该顶点的出边和其目标顶点（依赖包）显示为橙色
                const toSel = e.data.requiring.map(ri => `[index="${ri}"]`);
                if(toSel.length) {
                    circle.filter(toSel.join(',')).attr('fill', 'orange');
                    label.filter(toSel.join(',')).attr('fill', 'orange');
                    link.filter(`[from="${e.dataIndex}"]`).attr('stroke', '#d72');
                }
                // 将该顶点的入边和其源头顶点（被依赖包）显示为绿色
                const fromSel = e.data.requiredBy.map(ri => `[index="${ri}"]`);
                if(fromSel.length) {
                    circle.filter(fromSel.join(',')).attr('fill', 'green');
                    label.filter(fromSel.join(',')).attr('fill', 'green');
                    link.filter(`[to="${e.dataIndex}"]`).attr('stroke', '#2d2');
                }
                // 将根顶点到该顶点最短路径上的所有顶点和边（最短依赖路径）显示为青色
                const path = requirePaths[e.dataIndex];
                const pathSel = path.map(ri => `[index="${ri}"]`);
                if(pathSel.length) {
                    circle.filter(pathSel.join(',')).attr('fill', 'cyan');
                    label.filter(pathSel.join(',')).attr('fill', 'blue');
                    const linkSel = path.map(
                        (e, i) => i ? `[from="${path[i - 1]}"][to="${e}"]` : undefined
                    );
                    linkSel.shift();
                    if(linkSel.length) link.filter(linkSel.join(',')).attr('stroke', 'cyan');
                }
                // 将该顶点显示为红色
                d3.select(this).attr('stroke', 'red');
                label.filter(`[index="${e.dataIndex}"]`).attr('fill', 'red');
            })
            .on("mouseout", function(e) {  // 鼠标离开某个顶点
                desc.text('');
                d3.select(this).attr('stroke', (d) => getType(d, d.dataIndex, 3));

                label.attr('fill', null);
                circle.attr('fill', (d) => getType(d, d.dataIndex, 2));
                link.attr('stroke', '#999');
            })
        
        if(!root) root = nodeg.selectAll('[index="0"]');

        // 右键菜单事件
        const menuData = [
            { title: '隐藏顶点', action: (e) => (hide(e), update()) },
            { title: '隐藏依赖', action: (e) => (hideBorders(e), update()) }
        ];
        circleEnter.on('contextmenu', d3.contextMenu(menuData));
            
        // 更新力导模拟
        simulation.nodes(vsbNodes);
        simulation.force('link').links(vsbLinks);
        simulation.alpha(1).restart();
    }

    update();

    return svg.node();
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
const appendLine = (target, text, lineHeight = '1.2em') => {
    target
        .append('tspan')
        .attr('x', target.attr('x'))
        .attr('dy', lineHeight)
        .text(text);
}

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