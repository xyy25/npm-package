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

export const add = (set: number[], ...nums: number[]): number[] => {
    const res = set.length ? [...set] : [0];
    nums = nums.filter(e => e >= 0).sort((a, b) => a - b);
    let index = 0, base = 0;

    for(let num of nums) {
        while(num - base >= 32) {
            base += 32;
            index++;
            index >= res.length && res.push(0);
        }
        num -= base;
        res[index] |= 1 << num;
    }
    return res;
}