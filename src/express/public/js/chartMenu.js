const genTitle = (desc, judge = () => true, trueExpr = '开启', falseExpr = '关闭') => 
            `${desc}: ` + (judge() ? trueExpr : falseExpr);

const MenuData = (ct) => {
    const { options: opt } = ct;
    return [ 
        { 
            title: (e) => (e.showRequiring ? '收起' : '展开') + '依赖', 
            action: (e) => ((
                e.showRequiring ? 
                    ct.hideBorders(e) : ct.showRequiring(e.dataIndex)
                ), ct.update()),
            disabled: (e) => !e.dataIndex
        },
        { divider: true },
        { 
            title: (opt.simulationStop ? '继续' : '固定') + '移动', 
            action: () => {
                ct.simulation.stop(); 
                opt.simulationStop = !opt.simulationStop; 
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
            { devider: true },
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
                title:  genTitle('背景淡化', () => opt.fading),
                action: () => (opt.fading = !opt.fading, ct.updateOptions())
            }
        ] }
    ];
}

export default MenuData;