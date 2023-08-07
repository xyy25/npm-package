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
}

function D3view(option: Option, data: Data) {
    return new view(option, data)
}

let i = 0

class view implements View {
    static panel:any
    static duration:number
    static root: any
    static nodes: any
    static links: any

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
        view.duration = this.settings.duration!
        this.init()
    }
    init() {
        view.root = d3.hierarchy(this.data, d => d.children)
        
        view.root.x0 = 0
        view.root.y0 = 0

        view.root.children!.forEach(collapse)

        function collapse(d: any) {
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }
        template(this.settings)
        updateChart(view.root)
    }

}

function template(settings:Option) {
    // 创建svg
    const svg = d3
        .select(settings.dom)
        .append('svg')
        .attr('width', settings.width!)
        .attr('height', settings.height!)
    // 创建视图
    view.panel = svg
        .append("g")
        .attr('transform', "translate(" + settings.margin!.left + "," + settings.margin!.top + ")")
    // 创建拖拽
    const zoom:any = d3
        .zoom()
        .scaleExtent([0.1, 100])
        .on("zoom", () => {
            view.panel.attr(
                "transform",
                "translate(" +
                (d3.event.transform.x + settings.margin!.left) +
                "," +
                (d3.event.transform.y + settings.margin!.top) +
                ") scale(" +
                d3.event.transform.k +
                ")"
            );
        })
    // 绑定拖拽
    svg.call(zoom).on("dblclick.zoom", () => { })
    // 创建信息浮层
    const div = d3
    .select(settings.dom)
    .append('div')
    .attr('class','chartTooltip hidden')
    
    div.append('p').attr('class','name')
    div.append('p').attr('class','version')   
}

function updateChart(source:any) {
    // 定义Tree层级，并设置宽高
    let treemap = d3.tree().nodeSize([50, 50]);
    // 设置节点的x、y位置信息
    let treeData = treemap(view.root);

    // 计算新的Tree层级
    let nodes = treeData.descendants()
    let links = treeData.descendants().slice(1);
    // 设置每个同级节点间的y间距为100
    nodes.forEach(function (d: any) {
        d.y = d.depth * 100;
    });
// 为动画过渡保存旧的位置
   
    updateNodes(source,nodes)
    updateLinks(source,links)
    nodes.forEach(function (d: any) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
}
function updateNodes(source: any,nodes:any) {
    // 给节点添加id，用于选择集索引
    const node = view.panel.selectAll("g.node").data(nodes, (d: any) => d.id || (d.id = ++i))
    
    // enter得到多于当前页面element的数据
    // 获取enter的数据，对这些数据进行处理
    let nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("id", (d: any) => { return d.id })
        // 默认位置为当前父节点的位置
        .attr("transform", function () {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        // 设置鼠标放置显示的浮层
        .on("mouseover", (d: any) => {
            // 从d3.event获取鼠标的位置
            let transform = d3.event;
            let yPosition = transform.offsetY + 20;
            let xPosition = transform.offsetX + 20;
            // 将浮层位置设置为鼠标位置
            let chartTooltip = d3
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
        .on("click",click )

    // 给新的数据 绑定到新建的cycle元素上
    nodeEnter.append("circle")
        .attr("class", "node")
        .attr("r", 1e-6)
        // 如果元素有子节点，且为收起状态，则填充浅蓝色
        .style("fill", (d: any) => {
            return d._children ? "lightsteelblue" : d.data.children ? "#fff" : "#aaa";
        });

    // 给新加数据添加文字说明
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

    // 把新数据和旧的数据用merge合并一下
    let nodeUpdate = nodeEnter.merge(node);

    // 设置节点的位置变化，添加过渡动画效果
    nodeUpdate
        .transition()
        .duration(view.duration)
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

    // 获得少于当前element的元素并操作
    let nodeExit = node
        .exit()
        // 添加过渡动画
        .transition()
        .duration(view.duration)
        .attr("transform", function (d:any) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        // 移除元素
        .remove();

    // exit集中节点的cycle元素尺寸变为0
    nodeExit.select("circle").attr("r", 1e-6);

    // exit集中节点的text元素可见度降为0
    nodeExit.select("text").style("fill-opacity", 1e-6);
}
function updateLinks(source: any,links:any) {
    // 更新数据
    let link = view.panel.selectAll("path.link").data(links, (d: any)=> d.id);

    // 添加enter操作，添加类名为link的path元素
    let linkEnter = link
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
            let o = {
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
    let linkUpdate = linkEnter.merge(link);

    // 更新添加过渡动画
    linkUpdate
        .transition()
        .duration(view.duration)
        .attr("d", function (d: any) {
            return diagonalReverse(d, d.parent);
        });
    // 获取exit集
    let linkExit = link
        .exit()
        // 设置过渡动画
        .transition()
        .duration(view.duration)
        .attr("d", function (d:any) {
            let o = {
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
function click(d: any) {
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
            
            updateChart(d)
            d._clickid = null;
        }, 350);
    }
}

export default D3view
