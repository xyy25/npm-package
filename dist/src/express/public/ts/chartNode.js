"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.Link = void 0;
const utils_1 = require("./utils");
class Link {
    constructor(source, target, meta) {
        this.source = source;
        this.target = target;
        this.rotate = false;
        this.text = "";
        this.curve = 0;
        this.meta = meta !== null && meta !== void 0 ? meta : {
            range: 'root',
            type: 'norm',
            optional: false,
            invalid: false,
            depthEnd: false,
            symlink: false
        };
    }
    center() {
        const { source: s, target: t } = this;
        return (0, utils_1.getCenter)([s.x, s.y], [t.x, t.y]);
    }
    length() {
        const { source: s, target: t } = this;
        return (0, utils_1.getLength)([s.x, s.y], [t.x, t.y]);
    }
    ;
    // 获取线与x轴正方向所成的角度
    angle(deg = false, abs = false) {
        const { source: s, target: t } = this;
        return (0, utils_1.getAngle)([s.x, s.y], [t.x, t.y], deg, abs);
    }
    // 根据起始顶点，获取线两端的坐标
    ends() {
        const { source: s, target: t } = this, { sin, cos } = Math;
        // 线的两端应该在顶点圆的边上而非圆心，所以需要根据圆的半径对端点进行调整
        const proj = (cir, ofs, f) => (cir.r + ofs) * f(this.angle());
        const x1 = s.x + proj(s, 0, cos), y1 = s.y + proj(s, 0, sin);
        const x2 = t.x - proj(t, -2, cos), y2 = t.y - proj(t, -2, sin);
        return [[x1, y1], [x2, y2]];
    }
    // 获取边的svg-path路径描述
    getLinkPath() {
        const [[x1, y1], [x2, y2]] = this.ends();
        const { curve: e } = this;
        if (!e) {
            return `M${x1},${y1} L${x2},${y2}`;
        }
        else {
            const [cx, cy] = this.center(), agl = this.angle();
            const cutx = cx - e * Math.sin(agl);
            const cuty = cy + e * Math.cos(agl);
            return `M${x1},${y1} S${cutx},${cuty} ${x2},${y2}`;
        }
    }
    // 检查标签是否需要180°翻转
    getNoteFlip() {
        const { source: s, target: t } = this;
        const flip = this.rotate ? t.y < s.y : t.x < s.x;
        return flip;
    }
    // 获取边上标签的位置(已弃用)，现采用更强大的textPath，不需要transform了
    getNoteTransform() {
        const { source: s, target: t } = this;
        const [x, y] = this.center();
        let angle = this.angle(true, true);
        this.rotate && (angle -= 90);
        if ((s.x > t.x && s.y < t.y) || (s.x < t.x && s.y > t.y)) {
            angle = -angle;
        }
        return `translate(${x}, ${y}) rotate(${angle})`;
    }
}
exports.Link = Link;
class Node {
    constructor(dataIndex, data, temp = false) {
        this.dataIndex = dataIndex;
        this.data = data;
        this.temp = temp;
        this.showNode = false;
        this.showRequiring = false;
        this.r = 3.5;
        this.s = 1.5;
        this.depth = NaN;
        this.mate = [dataIndex];
        [this.vx, this.vy] = [0, 0];
        [this.x, this.y] = [0, 0];
    }
}
exports.Node = Node;
