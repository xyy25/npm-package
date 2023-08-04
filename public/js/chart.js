const chart = (svg, data) => {
    // Specify the chart’s dimensions.
    const width = 928;
    const height = 600;

    // Compute the graph and start the force simulation.

    //console.log(links)
    
    //const root = d3.hierarchy(data[0]);
    //const links = root.links();
    //const nodes = root.descendants();
    
    const nodes = data.map((e, i) => {return {
        index: i, vx: 0, vy: 0, x: 0, y: 0, data: e
    }});
    const links = data.reduce(
        (o, c, i) => o.concat(
            c.requiring.map(t => { return { source: nodes[i], target: nodes[t] }; })
        ), []);

    console.log(links, nodes);

    // 创建zoom操作
    var zoom = d3
    .zoom()
    // 设置缩放区域为0.1-100倍
    .scaleExtent([0.1, 100])
    .on("zoom", () => {
        // 子group元素将响应zoom事件，并更新transform状态
        const { k } = d3.event.transform;
        svg.attr(
            "transform",
            `scale(${k})`
        );
    });

    // svg层绑定zoom事件，同时释放zoom双击事件
    svg.call(zoom).on("dblclick.zoom", () => { });

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100).strength(0.5))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("collide", d3.forceCollide(2).strength(-50))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    // Create the container SVG.
    // const svg = d3.create("svg")
    //     .attr("width", width)
    //     .attr("height", height)
    //     .attr("viewBox", [-width / 2, -height / 2, width, height])
    //     .attr("style", "max-width: 100%; height: auto;");

    // Append links.
    defs(svg);

    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr('marker-end', 'url(#marker)');

    // Append nodes.
    const node = svg.append("g")

    const text = node
        .selectAll("text")
        .data(nodes)
        .join("text")
        .style("font-family", "monaco")
        .style("font-weight", "400")
        .style("font-size", "12px")
        .text(d => d.data.id)
        .call(drag(simulation))

    const circle = node
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("stroke-width", 1.5)
        .attr("fill", d => d.data.requiring.length ? "#fff" : "#000")
        .attr("stroke", (d, i) => !i ? "#d00" : d.data.requiring.length ? "#000" : "#fff")
        .attr("r", 3.5)
        .call(drag(simulation));

    circle.append("title")
        .html(d =>
            `<ruby>名称<rp>(</rp><rt>id</rt><rp>)</rp></ruby>: ${d.data.id}\n` +
            `<ruby>版本<rp>(</rp><rt>version</rt><rp>)</rp></ruby>: ${d.data.version}\n` +
            `<ruby>路径<rp>(</rp><rt>path</rt><rp>)</rp></ruby>: ${d.data.path}\n` +
            `<ruby>依赖<rp>(</rp><rt>dependencies</rt><rp>)</rp></ruby>: ${d.data.requiring.length}个包`);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        circle
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        text
            .attr("x", d => d.x - 30)
            .attr("y", d => d.y - 5);
    });

    //invalidation.then(() => simulation.stop());

    return svg.node();
}

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

const defs = (svg) => {
    const defs = svg.append('svg:defs');

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