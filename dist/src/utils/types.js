"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
有向图的表示方法：
{
    map: [{
            id: 'axios',
            version: '1.4.0',
            path: '\\node_modules'
        }, {
            id: 'pinus',
            version: '0.3.0',
            path: '\\node_modules'
        }, {
            id: 'commander',
            version: '1.0.0',
            path: '\\node_modules'
        }],
    borders: [
        [2],
        [0, 2],
        []
    ]
    // borders中下标为i的数组[a, c]表示从map[i]到a, b, c有一条有向边
    // 即map[i]依赖map[a], map[b]和map[c]
}
*/
