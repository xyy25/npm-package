import { ContextMenu } from "./lib/d3-context-menu";
import Chart from "./chart";
import { Node } from "./chartNode";

const genTitle = (desc: string, judge = () => true, trueExpr = '开启', falseExpr = '关闭') => 
        `${desc}: ` + (judge() ? trueExpr : falseExpr);

export const nodeMenu = (ct: Chart): ContextMenu.MenuItems<any, Node> => {
    const { options: opt } = ct;
    
    return [ 
        { 
            title: (e: Node) => (e.showRequiring ? '收起' : '展开') + '依赖', 
            action: (e: Node) => ((
                e.showRequiring ? 
                    ct.hideOutBorders(e.dataIndex) : 
                    ct.showOutBorders(e.dataIndex)
                ), ct.update()),
            disabled: (e: Node) => !e.dataIndex
        },
        { 
            title: '查看使用', 
            action: (e) => (ct.showInBorders(e.dataIndex), ct.update()),
            disabled: (e) => !e.dataIndex
        },
        {
            title: (e) => ct.marked.includes(e.dataIndex) ? '取消标记' : '标记顶点', 
            action: (e) => (ct.marked.includes(e.dataIndex) ? 
                    ct.unmarkNode(e.dataIndex) : ct.markNode(e.dataIndex), 
                console.log('当前标记', ct.marked), ct.updateOptions())
        },
        { divider: true },
        { 
            title: (opt.simulationStop ? '开启运动' : '固定视图'), 
            action: () => {
                opt.simulationStop = !opt.simulationStop;
                ct.simulation[opt.simulationStop ? 'stop' : 'restart']();
                ct.updateOptions();
            }
        },
        { title: '重置视图', action: () => (ct.resetNodes(), ct.update()) },
        { divider: true },
        { title: '选项..', children: [
            {
                title: genTitle('信息', () => opt.showDesc, '显示', '隐藏'),
                action: () => (opt.showDesc = !opt.showDesc, ct.updateOptions())
            },
            {
                title: genTitle('未使用包', () => opt.showExtraneous, '显示', '隐藏'),
                action: () => {
                    opt.showExtraneous = !opt.showExtraneous;
                    ct.nodes.filter(n => ct.requirePaths[n.dataIndex] === null)
                        .forEach(n => n.showNode = opt.showExtraneous)
                    ct.update();
                }
            },
            { divider: true },
            { 
                title: genTitle('入边高亮', () => opt.highlightRequiredBy), 
                action: () => (opt.highlightRequiredBy = !opt.highlightRequiredBy, ct.updateOptions())
            }, {
                title:  genTitle('出边高亮', () => opt.highlightRequiring),
                action: () => (opt.highlightRequiring = !opt.highlightRequiring, ct.updateOptions())
            }, {
                title:  genTitle('路径高亮', () => opt.highlightPath),
                action: () => (opt.highlightPath = !opt.highlightPath, ct.updateOptions())
            }, {
                title:  genTitle('分量高亮', () => opt.highlightComponent),
                action: () => (opt.highlightComponent = !opt.highlightComponent, ct.updateOptions())
            }, {
                title:  genTitle('背景淡化', () => opt.fading),
                action: () => (opt.fading = !opt.fading, ct.updateOptions())
            }
        ] }
    ];
}