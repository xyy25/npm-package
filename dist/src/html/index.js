"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const treeChart_1 = __importDefault(require("./components/treeChart"));
// 这里用的数据还是先前的{[map][borders]}没改
fetch('../../outputs/res1.json')
    .then(response => response.json())
    .then(data => {
    // 为所有节点加入children数组
    const nodes = data.map.map((node) => (Object.assign(Object.assign({}, node), { children: [] })));
    // 第一层遍历得到对应index节点的依赖节点数组
    data.borders.forEach((border, index) => {
        // 第二层遍历得到数组内对应index节点的依赖节点
        border.forEach((childIndex) => {
            nodes[index].children.push(nodes[childIndex]);
        });
    });
    // item就是根目录下的依赖包，依赖存在item的children内
    let item = nodes[0];
    // 给最终的节点加上随机的value，用于排序
    func(item.children);
    // 添加value
    function func(data) {
        data.forEach((item) => {
            if (!item.children.length) {
                item.value = Number((Math.random() * 100).toFixed(0));
            }
            else {
                func(item.children);
            }
        });
    }
    let dom = document.getElementsByTagName('body');
    (0, treeChart_1.default)({
        dom: dom[0],
        duration: 300
    }, item);
})
    .catch(error => {
    // 处理读取JSON文件时的错误
    console.error(error);
});
