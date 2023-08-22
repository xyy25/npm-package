"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
有向图的表示方法：
dia [
        {
            id: 'pinus',
            version: '0.3.0',
            dir: '\\node_modules',
            requiring: [1, 2],
            requiredBy: []
        }, {
            id: 'axios',
            version: '1.4.0',
            dir: '\\node_modules'
            requiring: [2],
            requiredBy: [0]
        }, {
            id: 'commander',
            version: '1.0.0',
            dir: '\\node_modules'
            requiring: [],
            requiredBy: [0, 1]
        }
]
    // 数组dia下标为i的元素dia[i]含有表示出边的属性requiring，表示依赖关系
    // 如dia[i].requiring = [a, b, c]表示从dia[i]到dia[a], dia[b], dia[c]有一条有向边
    // 同时，dia[j]也额外增加了一条表示入边的属性requiredBy，表示被依赖关系
    // 如dia[a].requiredBy = [i, j, k]表示从dia[i], dia[j], dia[k]到dia[a]有一条有向边
*/
