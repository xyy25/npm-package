import * as d3 from 'd3'

// 参数的定义
interface Data {
    id: string,
    version: number,
    path: string,
    children: Data[]
    value?: number
}
interface Option {
    // 真实dom
    dom: HTMLElement
    duration?: number
    height?: number
    width?: number
    margin?: Margin
}
interface Margin {
    top: number,
    bottom: number,
    left: number,
    right: number,
}

// 组件的定义
interface View {
    // 初始化
    init: Function
    // 编辑虚拟dom
    template: Function
    //node交互和绘制
    updateNodes: Function
    //link交互和绘制
    updateLinks: Function
}

function D3view(option: Option, data: Data) {
    return new view(option, data)
}

class view implements View {
    view:any
    root: any
    nodes: any
    links: any
    i: number


    constructor(private settings: Option, private data: Data) {
        this.settings = Object.assign({
            width: 800,
            height: 800,
            duration: 800,
            margin: {
                top: 300,
                bottom: 100,
                left: 100,
                right: 100
            }
        }, this.settings)

        this.init()

    }
    init() {
        this.root = d3.hierarchy(this.data, d => d.children)
        this.root.x0 = 0
        this.root.y0 = 0
        this.root.children!.forEach(collapse)



        function collapse(d: any) {
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }
        this.template()
        this.updateChart()

    }
    template() {
        // 创建svg
        const svg = d3
            .select(this.settings.dom)
            .append('svg')
            .attr('width', this.settings.width!)
            .attr('height', this.settings.height!)
        // 创建视图
        this.view = svg
            .append("g")
            .attr('transform', "translate(" + this.settings.margin!.left + "," + this.settings.margin!.top + ")")
        // 创建拖拽
        const zoom = d3
            .zoom()
            .scaleExtent([0.1, 1000])
            .on("zoom", () => {
                this.view.attr(
                    "transform",
                    "translate(" +
                    (d3.event.transform.x + this.settings.margin!.left) +
                    "," +
                    (d3.event.transform.y + this.settings.margin!.top) +
                    ") scale(" +
                    d3.event.transform.k +
                    ")"
                );
            })
        // 绑定拖拽
        svg.call(zoom).on("dblclick.zoom", () => { })
        // 创建信息浮层
        const div = d3
        .select(this.settings.dom)
        .append('div')
        .attr('class','chartTooltip hidden')
        
        div.append('p').attr('class','name')
        div.append('p').attr('class','version')
    }
    updateChart() {
        // 定义Tree层级，并设置宽高
        var treemap = d3.tree().nodeSize([50, 50]);
        // 设置节点的x、y位置信息
        var treeData = treemap(this.root);

        // 计算新的Tree层级
        this.nodes = treeData.descendants()
        this.links = treeData.descendants().slice(1);

        // 设置每个同级节点间的y间距为100
        this.nodes.forEach(function (d: any) {
            d.y = d.depth * 100;
        });

        this.updateNodes(this.root)
        this.updateLinks(this.root)

        // 为动画过渡保存旧的位置
        this.nodes.forEach(function (d: any) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }
    updateNodes(source: any) {
        // 给节点添加id，用于选择集索引
        const node = this.view.selectAll("g.node").data(this.nodes, (d: any) => d.id || (d.id = ++this.i))
        
        // 添加enter操作，添加爱类名为node的group元素
        let nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("id", (d: any) => { return d.data.id })
            // 默认位置为当前父节点的位置
            .attr("transform", function () {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            // 设置鼠标放置显示的浮层
            .on("mouseover", (d: any) => {
                // 从d3.event获取鼠标的位置
                var transform = d3.event;
                var yPosition = transform.offsetY + 20;
                var xPosition = transform.offsetX + 20;

                // 将浮层位置设置为鼠标位置
                var chartTooltip = d3
                    .select(".chartTooltip")
                    .style("left", xPosition + "px")
                    .style("top", yPosition + "px");

                // 更新浮层内容
                chartTooltip.select(".name").text('name：'+d.data.id);
                chartTooltip.select(".version").text('version：'+d.data.version);
                // 移除浮层hidden样式，展示浮层
                chartTooltip.classed("hidden", false);
            })
            // 鼠标离开隐藏浮层
            .on("mouseout", () => {
                // 添加浮层hidden样式，隐藏浮层
                d3.select(".chartTooltip").classed("hidden", true);
            })
            // 给每个新加的节点绑定click事件
            .on("click", (e: any) => { this.click(e) })

        // 给新加的group元素添加cycle元素
        nodeEnter.append("circle")
            .attr("class", "node")
            .attr("r", 1e-6)
            // 如果元素有子节点，且为收起状态，则填充浅蓝色
            .style("fill", (d: any) => {
                return d._children ? "lightsteelblue" : d.data.children ? "#fff" : "#aaa";
            });

        // 给新加的group元素添加文字说明
        nodeEnter.append("text")
            .attr("dy", ".35em")
            .attr("x", (d: any) => {
                return d.children || d._children ? -13 : 13;
            })
            .attr("text-anchor", (d: any) => {
                return d.children || d._children ? "end" : "start";
            })
            .text((d: any) => {
                return d.data.id;
            });

        // 获取update集
        var nodeUpdate = nodeEnter.merge(node);

        // 设置节点的位置变化，添加过渡动画效果
        nodeUpdate
            .transition()
            .duration(this.settings.duration)
            .attr("transform", function (d: any) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // 更新节点的属性和样式
        nodeUpdate
            .select("circle.node")
            .attr("r", 10)
            .style("fill", function (d: any) {
                return d._children ? "lightsteelblue" : d.data.children ? "#fff" : "#aaa";
            })
            .attr("cursor", "pointer");

        // 获取exit操作
        var nodeExit = node
            .exit()
            // 添加过渡动画
            .transition()
            .duration(this.settings.duration)
            .attr("transform", function () {
                return "translate(" + source.y + "," + source.x + ")";
            })
            // 移除元素
            .remove();

        // exit集中节点的cycle元素尺寸变为0
        nodeExit.select("circle").attr("r", 1e-6);

        // exit集中节点的text元素可见度降为0
        nodeExit.select("text").style("fill-opacity", 1e-6);
    }
    updateLinks(source: any) {
        // 更新数据
        var link = this.view.selectAll("path.link").data(this.links, function (d: any) {
            return d.id;
        });

        // 添加enter操作，添加类名为link的path元素
        var linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("class", "link")
            // 添加id
            .attr("id", (d: any) => {
                return "textPath" + d.id;
            })
            // .on("mouseover",  () => {
            //     d3.select(this).style("stroke", "orange");

            // })
            // .on("mouseout",  ()=> {
            //     d3.select(this).style("stroke", '#CCC');
            // })
            .on("click", (d: any) => {
                alert(d.parent.data.id + ' -> ' + d.data.id);
            })
            // 默认位置为当前父节点的位置
            .attr("d", function () {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonalReverse(o, o);
            });

        // enter操作中，添加text，同时添加与path匹配的textPath
        link
            .enter()
            .append("text")
            // 给text添加textPath元素
            .append("textPath")
            // 给textPath设置path的引用
            .attr("xlink:href", (d: any) => {
                return "#textPath" + d.id;
            })


        // 获取update集
        var linkUpdate = linkEnter.merge(link);

        // 更新添加过渡动画
        linkUpdate
            .transition()
            .duration(this.settings.duration)
            .attr("d", function (d: any) {
                return diagonalReverse(d, d.parent);
            });
        // 获取exit集
        var linkExit = link
            .exit()
            // 设置过渡动画
            .transition()
            .duration(this.settings.duration)
            .attr("d", function () {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonalReverse(o, o);
            })
            // 移除link
            .remove();



        // 添加贝塞尔曲线的path，方向为父节点指向子节点
        function diagonalReverse(s: any = {}, d: any = {}) {
            let path =
                `M ${d.y} ${d.x}
      C ${(s.y + d.y) / 2} ${d.x},
      ${(s.y + d.y) / 2} ${s.x},
      ${s.y} ${s.x}`;
            return path;
        }
    }
    click(d: any) {
        if (d._clickid) {
            // 若在200ms里面点击第二次，则不做任何操作，清空定时器
            clearTimeout(d._clickid);
            d._clickid = null;
        } else {
            // 首次点击，添加定时器，350ms后进行toggle
            d._clickid = setTimeout(() => {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                this.updateChart()
                d._clickid = null;
            }, 350);
        }
    }

}

export default D3view
