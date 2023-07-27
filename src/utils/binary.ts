// 二进制集合操作函数，优化备用

export const get = (set: number[], pos: number): boolean => {
    if(pos < 0) {
        return false;
    }
    let index = 0;
    while(pos >= 32) {
        pos -= 32;
        index++;
        if(index >= set.length) {
            return false;
        }
    }
    return !!((set[index] >> pos) & 1);
}

export const add = (set: number[], ...poses: number[]): number[] => {
    const res = set.length ? [...set] : [0];
    poses = poses.filter(e => e >= 0).sort((a, b) => a - b);
    let index = 0, base = 0;

    for(let pos of poses) {
        while(pos - base >= 32) {
            base += 32;
            index++;
            index >= res.length && res.push(0);
        }
        pos -= base;
        res[index] |= 1 << pos;
    }
    return res;
}