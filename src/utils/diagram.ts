import { find } from ".";
import { DepResult, DirectedDiagram, DiagramNode } from "./types";

export const toDiagram = (depResult: DepResult): DirectedDiagram => {
    const res: DirectedDiagram = [];
    
    const dfs = (dep: DepResult, originIndex: number = -1) => {
        for(const [id, item] of Object.entries(dep)) {
            const { 
                requires, version, dir, meta
            } = item;
            const newItem: DiagramNode = { 
                id, version, dir, 
                meta: [], requiring: [], 
                requiredBy: []
            };

            // 在纪录中查找该顶点
            let index = find(res, newItem);
            if(index === -1) {
                // 如果顶点不存在，则插入新顶点
                index = res.push(newItem) - 1;
            } else {
                // 如果顶点已存在，则在结点的被依赖（入边）属性中登记起始顶点
                res[index].requiredBy.push(originIndex);
            }
            if(originIndex >= 0) {
                newItem.requiredBy.push(originIndex);
                // 起始顶点的依赖（出边）属性中登记该顶点
                res[originIndex].requiring.push(index);
                // 登记边（依赖）属性
                res[originIndex].meta.push(meta ?? null);
            }
                
            if(requires) {
                dfs(requires, index);
            }
        }
    }

    dfs(depResult);
    return res;
}