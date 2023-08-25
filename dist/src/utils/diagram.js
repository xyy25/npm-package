"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDiagram = void 0;
const _1 = require(".");
const toDiagram = (depResult) => {
    const res = [];
    const dfs = (dep, originIndex = -1) => {
        for (const [id, item] of Object.entries(dep)) {
            const { space, name, requires, version, dir, meta } = item;
            const newItem = {
                id, space, name, version, dir,
                meta: [], requiring: [],
                requiredBy: []
            };
            // 在纪录中查找该顶点
            let index = (0, _1.find)(res, newItem);
            if (index === -1) {
                // 如果顶点不存在，则插入新顶点
                index = res.push(newItem) - 1;
            }
            else {
                // 如果顶点已存在，则在结点的被依赖（入边）属性中登记起始顶点
                res[index].requiredBy.push(originIndex);
            }
            if (originIndex >= 0) {
                newItem.requiredBy.push(originIndex);
                // 起始顶点的依赖（出边）属性中登记该顶点
                res[originIndex].requiring.push(index);
                // 登记边（依赖）属性
                res[originIndex].meta.push(meta !== null && meta !== void 0 ? meta : null);
            }
            if (requires) {
                dfs(requires, index);
            }
        }
    };
    dfs(depResult);
    return res;
};
exports.toDiagram = toDiagram;
